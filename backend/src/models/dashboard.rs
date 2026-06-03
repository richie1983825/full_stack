use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DashboardDto {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub panels: Value,
    pub variables: Value,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DashboardSummaryDto {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub panel_count: usize,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDashboardRequest {
    pub title: String,
    pub description: Option<String>,
    pub panels: Option<Value>,
    pub variables: Option<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDashboardRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub panels: Option<Value>,
    pub variables: Option<Value>,
}
