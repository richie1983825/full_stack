use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct ApiResponse<T: Serialize> {
    #[serde(rename = "errorCode")]
    pub error_code: String,
    #[serde(rename = "errorMessage")]
    pub error_message: String,
    pub success: bool,
    pub data: T,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            error_code: "00000".into(),
            error_message: String::new(),
            success: true,
            data,
        }
    }

    pub fn error(code: &str, message: &str) -> Self
    where
        T: Default + Serialize,
    {
        Self {
            error_code: code.into(),
            error_message: message.into(),
            success: false,
            data: T::default(),
        }
    }
}

/// Grafana 风格字段元数据（列顺序 = fields 数组顺序）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MetricFieldMeta {
    pub name: String,
    pub label: String,
    #[serde(rename = "type")]
    pub field_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub merge_same: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format: Option<String>,
}

// ====== 数据源管理 ======

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DatasourceResponse {
    pub id: uuid::Uuid,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub db_type: String,
    pub host: String,
    pub port: i32,
    pub database: String,
    pub username: String,
    pub created_at: chrono::DateTime<chrono::FixedOffset>,
    pub updated_at: chrono::DateTime<chrono::FixedOffset>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDatasourceRequest {
    pub name: String,
    pub description: Option<String>,
    pub db_type: Option<String>,
    pub host: String,
    pub port: Option<i32>,
    pub database: String,
    pub username: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDatasourceRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub db_type: Option<String>,
    pub host: Option<String>,
    pub port: Option<i32>,
    pub database: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatasourceQueryResult {
    pub fields: Vec<MetricFieldMeta>,
    pub rows: Vec<serde_json::Value>,
}
