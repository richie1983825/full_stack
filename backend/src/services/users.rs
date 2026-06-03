use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, Set,
    TransactionTrait,
};
use uuid::Uuid;

use crate::entity::{user_roles, users};
use crate::models::{CreateUserRequest, UpdateUserRequest, UserProfile};
use crate::services::auth::{build_user_profile, AuthError};

pub async fn list_users(db: &DatabaseConnection) -> Result<Vec<UserProfile>, AuthError> {
    let users = users::Entity::find()
        .order_by_asc(users::Column::Username)
        .all(db)
        .await?;

    let mut profiles = Vec::with_capacity(users.len());
    for user in users {
        profiles.push(build_user_profile(db, &user).await?);
    }
    Ok(profiles)
}

pub async fn get_user(db: &DatabaseConnection, id: Uuid) -> Result<UserProfile, AuthError> {
    let user = users::Entity::find_by_id(id)
        .one(db)
        .await?
        .ok_or(AuthError::NotFound)?;
    build_user_profile(db, &user).await
}

pub async fn create_user(
    db: &DatabaseConnection,
    req: CreateUserRequest,
) -> Result<UserProfile, AuthError> {
    let password_hash = bcrypt::hash(req.password, bcrypt::DEFAULT_COST)
        .map_err(|e| AuthError::Db(sea_orm::DbErr::Custom(e.to_string())))?;

    let txn = db.begin().await?;
    let now = Utc::now().fixed_offset();

    let user = users::ActiveModel {
        id: Set(Uuid::new_v4()),
        username: Set(req.username),
        email: Set(req.email),
        password_hash: Set(password_hash),
        display_name: Set(req.display_name),
        is_active: Set(req.is_active.unwrap_or(true)),
        is_grafana_admin: Set(req.is_grafana_admin.unwrap_or(false)),
        created_at: Set(now),
        updated_at: Set(now),
    }
    .insert(&txn)
    .await?;

    replace_user_roles(&txn, user.id, &req.role_ids).await?;
    txn.commit().await?;

    build_user_profile(db, &user).await
}

pub async fn update_user(
    db: &DatabaseConnection,
    id: Uuid,
    req: UpdateUserRequest,
) -> Result<UserProfile, AuthError> {
    let user = users::Entity::find_by_id(id)
        .one(db)
        .await?
        .ok_or(AuthError::NotFound)?;

    let txn = db.begin().await?;
    let mut active: users::ActiveModel = user.into();

    if let Some(email) = req.email {
        active.email = Set(email);
    }
    if let Some(display_name) = req.display_name {
        active.display_name = Set(display_name);
    }
    if let Some(is_active) = req.is_active {
        active.is_active = Set(is_active);
    }
    if let Some(is_grafana_admin) = req.is_grafana_admin {
        active.is_grafana_admin = Set(is_grafana_admin);
    }
    if let Some(password) = req.password {
        let password_hash = bcrypt::hash(password, bcrypt::DEFAULT_COST)
            .map_err(|e| AuthError::Db(sea_orm::DbErr::Custom(e.to_string())))?;
        active.password_hash = Set(password_hash);
    }
    active.updated_at = Set(Utc::now().fixed_offset());

    let user = active.update(&txn).await?;

    if let Some(role_ids) = req.role_ids {
        replace_user_roles(&txn, id, &role_ids).await?;
    }

    txn.commit().await?;
    build_user_profile(db, &user).await
}

pub async fn delete_user(db: &DatabaseConnection, id: Uuid) -> Result<(), AuthError> {
    users::Entity::delete_by_id(id).exec(db).await?;
    Ok(())
}

async fn replace_user_roles(
    db: &impl sea_orm::ConnectionTrait,
    user_id: Uuid,
    role_ids: &[Uuid],
) -> Result<(), AuthError> {
    user_roles::Entity::delete_many()
        .filter(user_roles::Column::UserId.eq(user_id))
        .exec(db)
        .await?;

    for role_id in role_ids {
        user_roles::ActiveModel {
            user_id: Set(user_id),
            role_id: Set(*role_id),
        }
        .insert(db)
        .await?;
    }

    Ok(())
}
