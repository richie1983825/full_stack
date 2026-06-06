use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder};
use uuid::Uuid;

use crate::config::Config;
use crate::entity::{permissions, role_permissions, roles, user_roles, users};
use crate::models::{
    Claims, LoginRequest, LoginResponse, PermissionItem, RoleSummary, UserProfile,
};

pub fn create_token(user: &users::Model, cfg: &Config) -> Result<String, jsonwebtoken::errors::Error> {
    let exp = (Utc::now() + Duration::hours(cfg.jwt_expires_hours))
        .timestamp() as usize;

    let claims = Claims {
        sub: user.id.to_string(),
        username: user.username.clone(),
        exp,
        is_grafana_admin: user.is_grafana_admin,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(cfg.jwt_secret.as_bytes()),
    )
}

pub fn verify_token(token: &str, cfg: &Config) -> Result<Claims, jsonwebtoken::errors::Error> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(cfg.jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map(|data| data.claims)
}

pub async fn login(
    db: &DatabaseConnection,
    cfg: &Config,
    req: LoginRequest,
) -> Result<LoginResponse, AuthError> {
    let user = users::Entity::find()
        .filter(users::Column::Username.eq(req.username))
        .one(db)
        .await?
        .ok_or(AuthError::InvalidCredentials)?;

    if !user.is_active {
        return Err(AuthError::InactiveUser);
    }

    let valid = bcrypt::verify(req.password, &user.password_hash)
        .map_err(|_| AuthError::InvalidCredentials)?;

    if !valid {
        return Err(AuthError::InvalidCredentials);
    }

    let profile = build_user_profile(db, &user).await?;
    let token = create_token(&user, cfg).map_err(|e| AuthError::TokenError(e.to_string()))?;

    Ok(LoginResponse { token, user: profile })
}

pub async fn get_user_profile(
    db: &DatabaseConnection,
    user_id: Uuid,
) -> Result<UserProfile, AuthError> {
    let user = users::Entity::find_by_id(user_id)
        .one(db)
        .await?
        .ok_or(AuthError::NotFound)?;

    build_user_profile(db, &user).await
}

pub async fn build_user_profile(
    db: &DatabaseConnection,
    user: &users::Model,
) -> Result<UserProfile, AuthError> {
    let user_role_rows = user_roles::Entity::find()
        .filter(user_roles::Column::UserId.eq(user.id))
        .all(db)
        .await?;

    let role_ids: Vec<Uuid> = user_role_rows.iter().map(|row| row.role_id).collect();

    let role_models = if role_ids.is_empty() {
        Vec::new()
    } else {
        roles::Entity::find()
            .filter(roles::Column::Id.is_in(role_ids.clone()))
            .order_by_asc(roles::Column::Name)
            .all(db)
            .await?
    };

    let role_summaries: Vec<RoleSummary> = role_models
        .iter()
        .map(|role| RoleSummary {
            id: role.id,
            name: role.name.clone(),
            description: role.description.clone(),
            is_system: role.is_system,
        })
        .collect();

    let role_ids: Vec<Uuid> = role_models.iter().map(|role| role.id).collect();

    let permission_codes = if user.is_grafana_admin {
        permissions::Entity::find()
            .order_by_asc(permissions::Column::Code)
            .all(db)
            .await?
            .into_iter()
            .map(|p| p.code)
            .collect()
    } else if role_ids.is_empty() {
        Vec::new()
    } else {
        let role_perm_rows = role_permissions::Entity::find()
            .filter(role_permissions::Column::RoleId.is_in(role_ids.clone()))
            .all(db)
            .await?;
        let permission_ids: Vec<Uuid> = role_perm_rows
            .iter()
            .map(|row| row.permission_id)
            .collect();

        if permission_ids.is_empty() {
            Vec::new()
        } else {
            permissions::Entity::find()
                .filter(permissions::Column::Id.is_in(permission_ids))
                .order_by_asc(permissions::Column::Code)
                .all(db)
                .await?
                .into_iter()
                .map(|p| p.code)
                .collect::<std::collections::BTreeSet<_>>()
                .into_iter()
                .collect()
        }
    };

    Ok(UserProfile {
        id: user.id,
        username: user.username.clone(),
        email: user.email.clone(),
        display_name: user.display_name.clone(),
        is_active: user.is_active,
        is_grafana_admin: user.is_grafana_admin,
        roles: role_summaries,
        permissions: permission_codes,
    })
}

pub async fn list_permissions(db: &DatabaseConnection) -> Result<Vec<PermissionItem>, AuthError> {
    let items = permissions::Entity::find()
        .order_by_asc(permissions::Column::Resource)
        .order_by_asc(permissions::Column::Action)
        .all(db)
        .await?;

    Ok(items
        .into_iter()
        .map(|item| PermissionItem {
            id: item.id,
            code: item.code,
            resource: item.resource,
            action: item.action,
            description: item.description,
        })
        .collect())
}

pub fn has_permission(profile: &UserProfile, code: &str) -> bool {
    profile.is_grafana_admin || profile.permissions.iter().any(|p| p == code)
}

#[derive(Debug)]
pub enum AuthError {
    InvalidCredentials,
    InactiveUser,
    NotFound,
    TokenError(String),
    Forbidden,
    Internal(String),
    Db(sea_orm::DbErr),
}

impl From<sea_orm::DbErr> for AuthError {
    fn from(value: sea_orm::DbErr) -> Self {
        Self::Db(value)
    }
}

impl std::fmt::Display for AuthError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidCredentials => write!(f, "invalid username or password"),
            Self::InactiveUser => write!(f, "user is inactive"),
            Self::NotFound => write!(f, "user not found"),
            Self::TokenError(msg) => write!(f, "token error: {msg}"),
            Self::Forbidden => write!(f, "permission denied"),
            Self::Internal(msg) => write!(f, "internal error: {msg}"),
            Self::Db(err) => write!(f, "database error: {err}"),
        }
    }
}
