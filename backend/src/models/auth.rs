use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserProfile,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub username: String,
    pub exp: usize,
    pub is_grafana_admin: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct UserProfile {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub display_name: String,
    pub is_active: bool,
    pub is_grafana_admin: bool,
    pub roles: Vec<RoleSummary>,
    pub permissions: Vec<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct RoleSummary {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub is_system: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct PermissionItem {
    pub id: Uuid,
    pub code: String,
    pub resource: String,
    pub action: String,
    pub description: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub email: String,
    pub password: String,
    pub display_name: String,
    pub is_active: Option<bool>,
    pub is_grafana_admin: Option<bool>,
    pub role_ids: Vec<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub email: Option<String>,
    pub display_name: Option<String>,
    pub password: Option<String>,
    pub is_active: Option<bool>,
    pub is_grafana_admin: Option<bool>,
    pub role_ids: Option<Vec<Uuid>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRoleRequest {
    pub name: String,
    pub description: Option<String>,
    pub permission_ids: Vec<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRoleRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub permission_ids: Option<Vec<Uuid>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRolePermissionsRequest {
    pub permission_ids: Vec<Uuid>,
}
