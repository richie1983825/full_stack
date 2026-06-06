use chrono::{Duration, Utc};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, Set,
};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::config::Config;
use crate::entity::{dashboard_schedules, dashboard_snapshots, dashboards};
use crate::models::{
    CreateSnapshotRequest, ScheduleDto, SnapshotDto, UpsertScheduleRequest,
};
use crate::services::auth::AuthError;
use crate::services::snapshot_html::render_snapshot_html;

fn new_snapshot_key() -> String {
    Uuid::new_v4().to_string().replace('-', "")[..16].to_string()
}

fn snapshot_view_url(cfg: &Config, key: &str) -> String {
    format!("{}/snapshots/{}", cfg.public_base_url.trim_end_matches('/'), key)
}

pub async fn create_snapshot(
    db: &DatabaseConnection,
    cfg: &Config,
    dashboard_id: Uuid,
    req: CreateSnapshotRequest,
    created_by: Option<Uuid>,
    date_mode: Option<&str>,
) -> Result<SnapshotDto, AuthError> {
    let dashboard = dashboards::Entity::find_by_id(dashboard_id)
        .one(db)
        .await?
        .ok_or(AuthError::NotFound)?;

    let mode = date_mode.unwrap_or("dashboard");
    let mut variables = dashboard.variables.clone();
    let date = resolve_snapshot_date(&variables, mode);
    if let Some(obj) = variables.as_object_mut() {
        obj.insert("date".into(), json!(date));
    }

    // SQL 数据源面板水合
    let panels = hydrate_sql_panels_for_snapshot(db, cfg, &dashboard.panels, &variables).await?;
    let generated_at = Utc::now().format("%Y-%m-%d %H:%M:%S UTC").to_string();
    let snapshot_title = req
        .title
        .filter(|t| !t.trim().is_empty())
        .unwrap_or_else(|| format!("{} · {}", dashboard.title, date));

    let html = render_snapshot_html(&snapshot_title, &variables, &panels, &generated_at);

    let key = new_snapshot_key();

    let now = Utc::now().fixed_offset();
    let expires_at = req.expires_hours.map(|hours| now + Duration::hours(hours));
    let id = Uuid::new_v4();

    let model = dashboard_snapshots::ActiveModel {
        id: Set(id),
        dashboard_id: Set(dashboard_id),
        snapshot_key: Set(key.clone()),
        title: Set(snapshot_title.clone()),
        variables: Set(variables.clone()),
        panels: Set(panels),
        html_content: Set(html),
        created_by: Set(created_by),
        created_at: Set(now),
        expires_at: Set(expires_at),
    }
    .insert(db)
    .await?;

    Ok(to_snapshot_dto(model, cfg))
}

pub async fn list_snapshots(
    db: &DatabaseConnection,
    cfg: &Config,
    dashboard_id: Uuid,
) -> Result<Vec<SnapshotDto>, AuthError> {
    let rows = dashboard_snapshots::Entity::find()
        .filter(dashboard_snapshots::Column::DashboardId.eq(dashboard_id))
        .order_by_desc(dashboard_snapshots::Column::CreatedAt)
        .all(db)
        .await?;

    Ok(rows.into_iter().map(|m| to_snapshot_dto(m, cfg)).collect())
}

pub async fn read_snapshot_html(
    db: &DatabaseConnection,
    key: &str,
) -> Result<String, AuthError> {
    let row = dashboard_snapshots::Entity::find()
        .filter(dashboard_snapshots::Column::SnapshotKey.eq(key))
        .one(db)
        .await?
        .ok_or(AuthError::NotFound)?;

    if let Some(expires) = row.expires_at {
        if expires < Utc::now().fixed_offset() {
            return Err(AuthError::NotFound);
        }
    }

    if row.html_content.is_empty() {
        return Err(AuthError::NotFound);
    }

    Ok(row.html_content)
}

pub async fn delete_snapshot(
    db: &DatabaseConnection,
    dashboard_id: Uuid,
    snapshot_id: Uuid,
) -> Result<(), AuthError> {
    dashboard_snapshots::Entity::find_by_id(snapshot_id)
        .filter(dashboard_snapshots::Column::DashboardId.eq(dashboard_id))
        .one(db)
        .await?
        .ok_or(AuthError::NotFound)?;

    dashboard_snapshots::Entity::delete_by_id(snapshot_id)
        .exec(db)
        .await?;

    Ok(())
}

pub async fn get_schedule(
    db: &DatabaseConnection,
    dashboard_id: Uuid,
) -> Result<Option<ScheduleDto>, AuthError> {
    let row = dashboard_schedules::Entity::find()
        .filter(dashboard_schedules::Column::DashboardId.eq(dashboard_id))
        .one(db)
        .await?;

    Ok(row.map(to_schedule_dto))
}

pub async fn upsert_schedule(
    db: &DatabaseConnection,
    dashboard_id: Uuid,
    req: UpsertScheduleRequest,
) -> Result<ScheduleDto, AuthError> {
    dashboards::Entity::find_by_id(dashboard_id)
        .one(db)
        .await?
        .ok_or(AuthError::NotFound)?;

    let now = Utc::now().fixed_offset();
    let next_run = if req.enabled {
        Some(now)
    } else {
        None
    };

    let existing = dashboard_schedules::Entity::find()
        .filter(dashboard_schedules::Column::DashboardId.eq(dashboard_id))
        .one(db)
        .await?;

    let model = if let Some(row) = existing {
        let mut active: dashboard_schedules::ActiveModel = row.into();
        active.enabled = Set(req.enabled);
        active.cron_expr = Set(req.cron_expr.clone());
        active.date_mode = Set(req.date_mode);
        active.updated_at = Set(now);
        if req.enabled {
            active.next_run_at = Set(next_run);
        }
        active.update(db).await?
    } else {
        dashboard_schedules::ActiveModel {
            id: Set(Uuid::new_v4()),
            dashboard_id: Set(dashboard_id),
            enabled: Set(req.enabled),
            cron_expr: Set(req.cron_expr.clone()),
            date_mode: Set(req.date_mode),
            last_run_at: Set(None),
            next_run_at: Set(next_run),
            created_at: Set(now),
            updated_at: Set(now),
        }
        .insert(db)
        .await?
    };

    Ok(to_schedule_dto(model))
}

pub async fn run_due_schedules(db: &DatabaseConnection, cfg: &Config) -> Result<(), AuthError> {
    let now = Utc::now().fixed_offset();
    let due = dashboard_schedules::Entity::find()
        .filter(dashboard_schedules::Column::Enabled.eq(true))
        .filter(
            dashboard_schedules::Column::NextRunAt
                .lte(now)
                .or(dashboard_schedules::Column::NextRunAt.is_null()),
        )
        .all(db)
        .await?;

    for schedule in due {
        let date_mode = schedule.date_mode.clone();
        let dashboard_id = schedule.dashboard_id;
        let _cron = schedule.cron_expr.clone();

        let result = create_snapshot(
            db,
            cfg,
            dashboard_id,
            CreateSnapshotRequest {
                title: None,
                expires_hours: None,
            },
            None,
            Some(&date_mode),
        )
        .await;

        match result {
            Ok(snapshot) => {
                log::info!(
                    "scheduled snapshot created for dashboard {}: {}",
                    dashboard_id,
                    snapshot.snapshot_key
                );
            }
            Err(e) => {
                log::error!(
                    "scheduled snapshot failed for dashboard {}: {}",
                    dashboard_id,
                    e
                );
            }
        }

        // 计算 cron 下次执行时间
        let next = cron_next(&schedule.cron_expr, now)
            .unwrap_or(now + Duration::hours(24));

        let mut active: dashboard_schedules::ActiveModel = schedule.into();
        active.last_run_at = Set(Some(now));
        active.next_run_at = Set(Some(next));
        active.updated_at = Set(now);
        let _ = active.update(db).await;
    }

    Ok(())
}

fn to_snapshot_dto(model: dashboard_snapshots::Model, cfg: &Config) -> SnapshotDto {
    SnapshotDto {
        id: model.id,
        dashboard_id: model.dashboard_id,
        snapshot_key: model.snapshot_key.clone(),
        title: model.title,
        variables: model.variables,
        view_url: snapshot_view_url(cfg, &model.snapshot_key),
        created_at: model.created_at.to_rfc3339(),
        expires_at: model.expires_at.map(|t| t.to_rfc3339()),
    }
}

/// 为 SQL 数据源面板水合数据（执行 SQL 查询并嵌入 option）
async fn hydrate_sql_panels_for_snapshot(
    db: &DatabaseConnection,
    cfg: &Config,
    panels: &Value,
    variables: &Value,
) -> Result<Value, AuthError> {
    use crate::services::datasources;
    let Some(items) = panels.as_array() else {
        return Ok(json!([]));
    };

    let mut hydrated: Vec<Value> = Vec::with_capacity(items.len());
    for panel in items {
        let datasource_id = panel
            .get("query")
            .and_then(|q| q.get("datasourceId"))
            .and_then(|v| v.as_str());

        // 与前端 resolveSql() 保持一致：Builder 模式从字段组装 SQL
        let sql = resolve_panel_sql(panel, variables);

        let mut out = panel.clone();

        if let (Some(ds_id), Some(query_sql)) = (datasource_id, sql.as_deref()) {
            if let Ok(ds_uuid) = Uuid::parse_str(ds_id) {
                match datasources::query_datasource_sql(db, cfg, ds_uuid, query_sql).await {
                    Ok(result) => {
                        let option = sql_result_to_echarts(&result, panel);
                        if let Some(obj) = out.as_object_mut() {
                            obj.insert("option".into(), option);
                            obj.remove("query");
                        }
                    }
                    Err(e) => {
                        log::warn!("Snapshot SQL query failed for panel: {e}");
                    }
                }
            }
        }

        hydrated.push(out);
    }

    Ok(json!(hydrated))
}

/// 与前端 resolveSql() 保持一致：Builder 模式从字段组装 SQL，支持 ${var} 替换
fn resolve_panel_sql(panel: &Value, variables: &Value) -> Option<String> {
    let q = panel.get("query")?;
    let sql_mode = q.get("sqlMode").and_then(|v| v.as_str());

    let mut sql = if sql_mode == Some("builder") {
        let table = q.get("sqlTable").and_then(|v| v.as_str())?;
        let columns = q.get("sqlColumns").and_then(|v| v.as_array());
        let where_clause = q.get("sqlWhere").and_then(|v| v.as_str()).unwrap_or("");
        let order_by = q.get("sqlOrderBy").and_then(|v| v.as_str()).unwrap_or("");

        let cols = match columns {
            Some(arr) if !arr.is_empty() => {
                arr.iter()
                    .filter_map(|v| v.as_str().map(|s| format!("\"{}\"", s)))
                    .collect::<Vec<_>>()
                    .join(", ")
            }
            _ => "*".to_string(),
        };

        let mut s = format!("SELECT {} FROM \"{}\"", cols, table);
        if !where_clause.is_empty() {
            s.push_str(&format!(" WHERE {}", where_clause));
        }
        if !order_by.is_empty() {
            s.push_str(&format!(" ORDER BY {}", order_by));
        }
        s.push_str(" LIMIT 100");
        s
    } else {
        q.get("sql").and_then(|v| v.as_str())?.to_string()
    };

    // 替换变量 ${date} 等
    if let Some(obj) = variables.as_object() {
        for (key, value) in obj {
            let replacement = match value {
                Value::String(s) => s.clone(),
                other => other.to_string().trim_matches('"').to_string(),
            };
            sql = sql.replace(&format!("${{{}}}", key), &replacement);
        }
    }

    Some(sql)
}

/// 将 SQL 查询结果转换为 ECharts option（简单版，用于快照）
fn sql_result_to_echarts(
    result: &crate::models::DatasourceQueryResult,
    panel: &Value,
) -> Value {
    let chart_type = panel
        .get("chartType")
        .and_then(|v| v.as_str())
        .unwrap_or("line");

    if chart_type == "table" {
        let data: Vec<Value> = result
            .rows
            .iter()
            .map(|row| {
                let map: serde_json::Map<String, Value> = row
                    .as_object()
                    .cloned()
                    .unwrap_or_default()
                    .into_iter()
                    .collect();
                Value::Object(map)
            })
            .collect();
        return json!({
            "fields": result.fields,
            "data": data,
        });
    }

    // 折线图/柱状图：第一列为类别，其余为数值
    if result.rows.is_empty() {
        return json!({
            "xAxis": { "type": "category", "data": [] },
            "yAxis": { "type": "value" },
            "series": [],
        });
    }

    let field_names: Vec<String> = result.fields.iter().map(|f| f.name.clone()).collect();
    let category_field = &field_names[0];
    let value_fields: Vec<&String> = field_names.iter().skip(1).collect();

    let categories: Vec<String> = result
        .rows
        .iter()
        .map(|r| {
            r.get(category_field)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string()
        })
        .collect();

    let series: Vec<Value> = value_fields
        .iter()
        .map(|vf| {
            let data: Vec<f64> = result
                .rows
                .iter()
                .map(|r| {
                    r.get(*vf)
                        .and_then(|v| v.as_f64())
                        .or_else(|| r.get(*vf).and_then(|v| v.as_i64().map(|i| i as f64)))
                        .unwrap_or(0.0)
                })
                .collect();
            json!({
                "name": vf.as_str(),
                "type": if chart_type == "bar" { "bar" } else { "line" },
                "data": data,
                "smooth": chart_type != "bar",
            })
        })
        .collect();

    if chart_type == "bar" {
        json!({
            "tooltip": { "trigger": "axis" },
            "legend": { "bottom": 0, "type": "scroll" },
            "xAxis": { "type": "value" },
            "yAxis": { "type": "category", "data": categories },
            "series": series,
        })
    } else {
        json!({
            "tooltip": { "trigger": "axis" },
            "legend": { "bottom": 0, "type": "scroll" },
            "xAxis": { "type": "category", "data": categories },
            "yAxis": { "type": "value" },
            "series": series,
        })
    }
}

/// 计算 cron 表达式的下一次触发时间
fn cron_next(expr: &str, from: chrono::DateTime<chrono::FixedOffset>) -> Option<chrono::DateTime<chrono::FixedOffset>> {
    use cron::Schedule;
    use std::str::FromStr;

    let schedule = Schedule::from_str(expr).ok()?;
    let from_utc = from.with_timezone(&chrono::Utc);
    let next_utc = schedule.after(&from_utc).next()?;
    // Preserve offset from original time
    let offset = from.offset();
    Some(next_utc.with_timezone(&chrono::FixedOffset::east_opt(offset.local_minus_utc())?))
}

fn to_schedule_dto(model: dashboard_schedules::Model) -> ScheduleDto {
    ScheduleDto {
        id: model.id,
        dashboard_id: model.dashboard_id,
        enabled: model.enabled,
        cron_expr: model.cron_expr,
        date_mode: model.date_mode,
        last_run_at: model.last_run_at.map(|t| t.to_rfc3339()),
        next_run_at: model.next_run_at.map(|t| t.to_rfc3339()),
    }
}

pub fn resolve_snapshot_date(variables: &Value, date_mode: &str) -> String {
    use chrono::{Duration, Local};

    match date_mode {
        "today" => Local::now().date_naive().format("%Y-%m-%d").to_string(),
        "yesterday" => (Local::now().date_naive() - Duration::days(1))
            .format("%Y-%m-%d")
            .to_string(),
        _ => variables
            .get("date")
            .and_then(|v| v.as_str())
            .unwrap_or("2026-05-13")
            .to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn resolve_code_mode_replaces_date() {
        let panel = json!({
            "query": { "sql": "SELECT * FROM t WHERE dt = '${date}'", "sqlMode": "code" }
        });
        let vars = json!({ "date": "2026-06-03" });
        let sql = resolve_panel_sql(&panel, &vars).unwrap();
        assert_eq!(sql, "SELECT * FROM t WHERE dt = '2026-06-03'");
    }

    #[test]
    fn resolve_builder_mode() {
        let panel = json!({
            "query": {
                "sqlMode": "builder", "sqlTable": "users",
                "sqlColumns": ["name", "email"],
                "sqlWhere": "active = true",
                "sqlOrderBy": "name ASC"
            }
        });
        let sql = resolve_panel_sql(&panel, &json!({})).unwrap();
        assert!(sql.contains("SELECT \"name\", \"email\" FROM \"users\""));
        assert!(sql.contains("WHERE active = true"));
        assert!(sql.contains("ORDER BY name ASC"));
    }

    #[test]
    fn resolve_empty_variables_preserves_placeholder() {
        let panel = json!({
            "query": { "sql": "SELECT * FROM t WHERE dt = '${date}'", "sqlMode": "code" }
        });
        let sql = resolve_panel_sql(&panel, &json!({})).unwrap();
        // 空变量时不替换，保留占位符（后端快照由调用方负责设置变量）
        assert!(sql.contains("${date}"));
    }
}
