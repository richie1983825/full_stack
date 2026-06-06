use chrono::Utc;
use sea_orm::EntityTrait;
use sea_orm::DatabaseConnection;
use serde_json::Value;
use uuid::Uuid;

use crate::config::Config;
use crate::entity::{dashboards, datasources as datasource_entity};
use crate::models::{
    ColumnContext, DashboardChatRequest, DashboardChatResponse, DatasourceContext,
    ExistingPanelContext, LlmChatOutput, PanelQueryDto, SchemaContext, SuggestedPanelDto,
    TableColumnsContext, TableSummaryContext,
};
use crate::services::auth::AuthError;
use crate::services::datasources as datasource_service;
use crate::services::deepseek::{self, ChatMessage, DeepseekError};

const MAX_HISTORY: usize = 10;
const MAX_TABLES_IN_LIST: usize = 200;
const MAX_COLUMNS_PER_TABLE: usize = 50;

#[derive(Debug)]
pub enum AiChatError {
    Deepseek(DeepseekError),
    Validation(String),
    Auth(AuthError),
}

impl From<AuthError> for AiChatError {
    fn from(value: AuthError) -> Self {
        Self::Auth(value)
    }
}

impl From<DeepseekError> for AiChatError {
    fn from(value: DeepseekError) -> Self {
        Self::Deepseek(value)
    }
}

impl From<sea_orm::DbErr> for AiChatError {
    fn from(value: sea_orm::DbErr) -> Self {
        Self::Auth(AuthError::Internal(value.to_string()))
    }
}

impl std::fmt::Display for AiChatError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Deepseek(e) => write!(f, "{e}"),
            Self::Validation(msg) => write!(f, "{msg}"),
            Self::Auth(e) => write!(f, "{e}"),
        }
    }
}

impl AiChatError {
    pub fn error_code(&self) -> &'static str {
        match self {
            Self::Deepseek(DeepseekError::NotConfigured) => "AI_50301",
            Self::Deepseek(DeepseekError::Timeout) => "AI_50302",
            Self::Deepseek(DeepseekError::RateLimited) => "AI_42901",
            Self::Deepseek(DeepseekError::InsufficientBalance) => "AI_40201",
            Self::Deepseek(DeepseekError::InvalidKey) => "AI_40101",
            Self::Deepseek(DeepseekError::Api(_)) => "AI_50001",
            Self::Validation(_) => "AI_40001",
            Self::Auth(AuthError::NotFound) => "10004",
            Self::Auth(_) => "10006",
        }
    }

    pub fn http_status(&self) -> actix_web::http::StatusCode {
        use actix_web::http::StatusCode;
        match self {
            Self::Deepseek(DeepseekError::NotConfigured) => StatusCode::SERVICE_UNAVAILABLE,
            Self::Deepseek(DeepseekError::Timeout) => StatusCode::GATEWAY_TIMEOUT,
            Self::Deepseek(DeepseekError::RateLimited) => StatusCode::TOO_MANY_REQUESTS,
            Self::Deepseek(DeepseekError::InsufficientBalance) => StatusCode::PAYMENT_REQUIRED,
            Self::Deepseek(DeepseekError::InvalidKey) => StatusCode::SERVICE_UNAVAILABLE,
            Self::Deepseek(DeepseekError::Api(_)) => StatusCode::BAD_GATEWAY,
            Self::Validation(_) => StatusCode::BAD_REQUEST,
            Self::Auth(AuthError::NotFound) => StatusCode::NOT_FOUND,
            Self::Auth(_) => StatusCode::BAD_REQUEST,
        }
    }
}

pub async fn dashboard_chat(
    db: &DatabaseConnection,
    cfg: &Config,
    dashboard_id: Uuid,
    req: DashboardChatRequest,
) -> Result<DashboardChatResponse, AiChatError> {
    let message = req.message.trim();
    if message.is_empty() {
        return Err(AiChatError::Validation("消息不能为空".into()));
    }

    let api_key = deepseek::ensure_configured(cfg.deepseek_api_key.as_ref())?;

    let dashboard = dashboards::Entity::find_by_id(dashboard_id)
        .one(db)
        .await?
        .ok_or(AuthError::NotFound)?;

    let ds = datasource_entity::Entity::find_by_id(req.datasource_id)
        .one(db)
        .await
        .map_err(|e| AiChatError::Validation(e.to_string()))?
        .ok_or_else(|| AiChatError::Validation("数据源不存在".into()))?;

    let schema = build_schema_context(db, cfg, &dashboard, &ds, &req.reference_tables).await?;

    let system_prompt = build_system_prompt(&schema);

    // 取少量样本数据用于一键分析
    let sample_data = if message == "/analyze" {
        fetch_sample_data(db, cfg, &ds, &req.reference_tables).await
    } else {
        String::new()
    };

    // 处理特殊命令
    let user_prompt = match message {
        "/analyze" => format!(
            "## 一键分析\n\
             请根据以下信息对选中的数据库表进行直接分析总结（**不要反问用户**）：\n\
             - 表结构已在上文中描述（字段名、类型）\n\
             - 下面是每张表的少量样本数据\n\
             \n\
             样本数据：\n{}\n\
             \n\
             请输出：\n\
             1. 每张表的字段概览及含义推断\n\
             2. 数据特征（规模、分布等）\n\
             3. 可做的分析方向建议\n\
             不要生成图表面板，只需 Markdown 文字分析。",
            sample_data
        ),
        "/build_chart" => format!(
            "## 一键制图\n\
             请根据参考表自动推荐一张图表（**不要反问用户，直接生成**）：\n\
             - 自动选择合适的图表类型（line/bar/table）\n\
             - 自动选择有意义的字段作为分类轴和数值系列\n\
             - 生成可执行的 SELECT SQL\n\
             \n\
             参考表：{}\n\
             \n\
             **必须**在 suggestedPanel 中给出完整的面板配置。",
            req.reference_tables.join(", ")
        ),
        _ => format!("用户请求：{message}"),
    };

    let mut messages = vec![ChatMessage {
        role: "system".into(),
        content: system_prompt,
    }];

    let history: Vec<_> = req
        .history
        .into_iter()
        .filter(|h| h.role == "user" || h.role == "assistant")
        .rev()
        .take(MAX_HISTORY)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect();

    for item in history {
        messages.push(ChatMessage {
            role: item.role,
            content: item.content,
        });
    }
    messages.push(ChatMessage {
        role: "user".into(),
        content: user_prompt,
    });

    let raw = deepseek::chat_json(api_key, messages).await?;
    let output: LlmChatOutput = serde_json::from_str(&raw)
        .map_err(|e| AiChatError::Validation(format!("AI 返回格式无效: {e}")))?;

    let suggested_panel = output
        .suggested_panel
        .map(|panel| {
            validate_sql(&panel.sql)?;
            let chart_type = panel.chart_type.to_lowercase();
            if !matches!(chart_type.as_str(), "line" | "bar" | "table") {
                return Err(AiChatError::Validation(format!(
                    "不支持的图表类型: {}",
                    panel.chart_type
                )));
            }
            Ok(SuggestedPanelDto {
                title: panel.title,
                chart_type,
                query: PanelQueryDto {
                    datasource_id: ds.id.to_string(),
                    sql_mode: "code".into(),
                    sql: panel.sql,
                },
                grid: None,
            })
        })
        .transpose()?;

    Ok(DashboardChatResponse {
        id: format!("msg-{}", Uuid::new_v4()),
        role: "assistant".into(),
        content: output.content,
        suggested_panel,
        timestamp: Utc::now().to_rfc3339(),
    })
}

async fn build_schema_context(
    db: &DatabaseConnection,
    cfg: &Config,
    dashboard: &dashboards::Model,
    ds: &datasource_entity::Model,
    reference_tables: &[String],
) -> Result<SchemaContext, AiChatError> {
    let mut pinned: Vec<String> = reference_tables
        .iter()
        .map(|t| t.trim().to_string())
        .filter(|t| !t.is_empty())
        .collect();
    pinned.sort();
    pinned.dedup();

    if pinned.is_empty() {
        return Err(AiChatError::Validation("请先选择参考表".into()));
    }

    // 仅获取选中表的详细信息（不发送全量表列表）
    let mut table_columns = Vec::new();
    for table in &pinned {
        let cols = datasource_service::list_columns(db, cfg, ds.id, table)
            .await
            .map_err(|e| AiChatError::Validation(format!("无法获取表 {table} 的字段: {e}")))?;
        table_columns.push(TableColumnsContext {
            table: table.clone(),
            columns: cols
                .into_iter()
                .take(MAX_COLUMNS_PER_TABLE)
                .map(|c| ColumnContext {
                    name: c.name,
                    data_type: c.data_type,
                    comment: c.comment,
                })
                .collect(),
        });
    }

    let existing_panels = extract_existing_panels(&dashboard.panels);

    Ok(SchemaContext {
        datasource: DatasourceContext {
            id: ds.id.to_string(),
            name: ds.name.clone(),
            db_type: ds.db_type.clone(),
            database: ds.database.clone(),
        },
        tables: vec![], // 不再发送全量表列表
        table_columns,
        variables: dashboard.variables.clone(),
        existing_panels,
    })
}

fn extract_existing_panels(panels: &Value) -> Vec<ExistingPanelContext> {
    let Some(arr) = panels.as_array() else {
        return vec![];
    };

    arr.iter()
        .filter_map(|p| {
            let title = p.get("title")?.as_str()?.to_string();
            let chart_type = p
                .get("chartType")
                .or_else(|| p.get("chart_type"))
                .and_then(|v| v.as_str())
                .unwrap_or("unknown")
                .to_string();
            let sql = p
                .get("query")
                .and_then(|q| q.get("sql"))
                .and_then(|s| s.as_str())
                .map(str::to_string);
            Some(ExistingPanelContext {
                title,
                chart_type,
                sql,
            })
        })
        .collect()
}

fn build_system_prompt(ctx: &SchemaContext) -> String {
    let dialect = match ctx.datasource.db_type.as_str() {
        "mysql" => "MySQL",
        _ => "PostgreSQL",
    };

    let schema_json = serde_json::to_string_pretty(ctx).unwrap_or_default();

    format!(
        r#"你是 CMP 容量管理平台的报表助手。用户正在编辑仪表盘，需要你根据自然语言生成 SQL 查询面板配置。

## 能力范围
- 仅生成 line（折线图）、bar（柱状图）、table（表格）三种面板
- 仅生成 SELECT 查询，禁止 INSERT/UPDATE/DELETE/DDL
- SQL 方言: {dialect}
- 必须使用 datasourceId = "{ds_id}"（已在 query 中固定，你只需输出 sql 字段）
- 仪表盘变量可在 SQL 中用 ${{变量名}} 占位，例如 ${{date}}；生成 SQL 时请使用这些占位符

## 当前数据上下文
```json
{schema_json}
```

## 输出格式（严格 JSON）
{{
  "content": "给用户的 Markdown 说明",
  "suggestedPanel": {{
    "title": "面板标题",
    "chartType": "line|bar|table",
    "sql": "SELECT ..."
  }}
}}

规则：
1. 若用户只是闲聊或与报表无关，suggestedPanel 省略，仅在 content 中回复
2. 若可以生成面板，必须给出完整可执行的 SELECT SQL
3. 优先使用「参考表」中的字段；未指定参考表时可从表名列表推断，但应在 content 中说明假设
4. 折线图/柱状图：第一列作为分类轴，其余列为数值系列
5. 表格：SELECT 所需列即可
6. 一条回复最多一个 suggestedPanel
7. content 使用简洁中文 Markdown
8. **重要**：不要对 numeric 列使用 = '' 比较；过滤空值用 IS NOT NULL
9. 字符串值用单引号包裹（PostgreSQL 标准）"#,
        ds_id = ctx.datasource.id,
    )
}

/// 获取参考表的样本数据（最多 5 行），格式化为文本
async fn fetch_sample_data(
    db: &DatabaseConnection,
    cfg: &Config,
    ds: &datasource_entity::Model,
    tables: &[String],
) -> String {
    let mut result = String::new();
    for table in tables {
        let sql = format!("SELECT * FROM \"{}\" LIMIT 5", table);
        match datasource_service::query_datasource_sql(db, cfg, ds.id, &sql).await {
            Ok(data) => {
                result.push_str(&format!("\n### {}\n", table));
                if data.rows.is_empty() {
                    result.push_str("(空表)\n");
                } else {
                    // 输出列名
                    let cols: Vec<_> = data.fields.iter().map(|f| f.name.as_str()).collect();
                    result.push_str(&format!("| {} |\n", cols.join(" | ")));
                    result.push_str(&format!("|{}|\n", cols.iter().map(|_| "---").collect::<Vec<_>>().join("|")));
                    for row in &data.rows {
                        let vals: Vec<_> = cols
                            .iter()
                            .map(|c| {
                                row.get(*c)
                                    .map(|v| format!("{}", v).trim_matches('"').to_string())
                                    .unwrap_or_default()
                            })
                            .collect();
                        result.push_str(&format!("| {} |\n", vals.join(" | ")));
                    }
                }
            }
            Err(e) => {
                result.push_str(&format!("\n### {} (查询失败: {})\n", table, e));
            }
        }
    }
    if result.is_empty() {
        result = "(未获取到样本数据)".into();
    }
    result
}

fn validate_sql(sql: &str) -> Result<(), AiChatError> {
    let trimmed = sql.trim();
    if trimmed.is_empty() {
        return Err(AiChatError::Validation("SQL 不能为空".into()));
    }

    let normalized = trimmed
        .split_whitespace()
        .next()
        .unwrap_or("")
        .to_lowercase();
    if normalized != "select" && !normalized.starts_with("with") {
        return Err(AiChatError::Validation("仅允许 SELECT 查询".into()));
    }

    let upper = trimmed.to_uppercase();
    for forbidden in [
        "INSERT ", "UPDATE ", "DELETE ", "DROP ", "ALTER ", "CREATE ", "TRUNCATE ", "GRANT ",
        "REVOKE ", "EXEC ", "EXECUTE ",
    ] {
        if upper.contains(forbidden) {
            return Err(AiChatError::Validation(format!("SQL 包含禁止的操作: {forbidden}")));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_select_ok() {
        assert!(validate_sql("SELECT id FROM users").is_ok());
        assert!(validate_sql("WITH cte AS (SELECT 1) SELECT * FROM cte").is_ok());
    }

    #[test]
    fn validate_forbidden() {
        assert!(validate_sql("DELETE FROM users").is_err());
    }
}
