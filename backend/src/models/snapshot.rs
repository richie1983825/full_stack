use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotDto {
    pub id: Uuid,
    pub dashboard_id: Uuid,
    pub snapshot_key: String,
    pub title: String,
    pub variables: Value,
    pub view_url: String,
    pub created_at: String,
    pub expires_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSnapshotRequest {
    pub title: Option<String>,
    pub expires_hours: Option<i64>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleDto {
    pub id: Uuid,
    pub dashboard_id: Uuid,
    pub enabled: bool,
    pub interval_hours: i32,
    pub date_mode: String,
    pub last_run_at: Option<String>,
    pub next_run_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertScheduleRequest {
    pub enabled: bool,
    pub interval_hours: i32,
    pub date_mode: String,
}
