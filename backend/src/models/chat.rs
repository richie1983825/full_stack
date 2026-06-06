use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardChatRequest {
    pub message: String,
    pub datasource_id: Uuid,
    #[serde(default)]
    pub reference_tables: Vec<String>,
    #[serde(default)]
    pub history: Vec<ChatHistoryItem>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ChatHistoryItem {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardChatResponse {
    pub id: String,
    pub role: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggested_panel: Option<SuggestedPanelDto>,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SuggestedPanelDto {
    pub title: String,
    pub chart_type: String,
    pub query: PanelQueryDto,
    #[serde(default)]
    pub grid: Option<PanelGridDto>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PanelQueryDto {
    pub datasource_id: String,
    pub sql_mode: String,
    pub sql: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PanelGridDto {
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
}

/// LLM 返回的 JSON 结构
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmChatOutput {
    pub content: String,
    #[serde(default)]
    pub suggested_panel: Option<LlmSuggestedPanel>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmSuggestedPanel {
    pub title: String,
    pub chart_type: String,
    pub sql: String,
}

#[derive(Debug, Serialize)]
pub struct SchemaContext {
    pub datasource: DatasourceContext,
    pub tables: Vec<TableSummaryContext>,
    pub table_columns: Vec<TableColumnsContext>,
    pub variables: Value,
    pub existing_panels: Vec<ExistingPanelContext>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableSummaryContext {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub comment: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatasourceContext {
    pub id: String,
    pub name: String,
    pub db_type: String,
    pub database: String,
}

#[derive(Debug, Serialize)]
pub struct TableColumnsContext {
    pub table: String,
    pub columns: Vec<ColumnContext>,
}

#[derive(Debug, Serialize)]
pub struct ColumnContext {
    pub name: String,
    #[serde(rename = "dataType")]
    pub data_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub comment: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExistingPanelContext {
    pub title: String,
    pub chart_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sql: Option<String>,
}
