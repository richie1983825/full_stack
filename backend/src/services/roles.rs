use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, Set,
    TransactionTrait,
};
use uuid::Uuid;

use crate::entity::{permissions, role_permissions, roles};
use crate::models::{CreateRoleRequest, PermissionItem, UpdateRoleRequest};
use crate::services::auth::AuthError;

#[derive(Debug, serde::Serialize, Clone)]
pub struct RoleDetail {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub is_system: bool,
    pub permissions: Vec<PermissionItem>,
}

pub async fn list_roles(db: &DatabaseConnection) -> Result<Vec<RoleDetail>, AuthError> {
    let roles = roles::Entity::find()
        .order_by_asc(roles::Column::Name)
        .all(db)
        .await?;

    let mut result = Vec::with_capacity(roles.len());
    for role in roles {
        result.push(build_role_detail(db, role).await?);
    }
    Ok(result)
}

pub async fn get_role(db: &DatabaseConnection, id: Uuid) -> Result<RoleDetail, AuthError> {
    let role = roles::Entity::find_by_id(id)
        .one(db)
        .await?
        .ok_or(AuthError::NotFound)?;
    build_role_detail(db, role).await
}

pub async fn create_role(
    db: &DatabaseConnection,
    req: CreateRoleRequest,
) -> Result<RoleDetail, AuthError> {
    let txn = db.begin().await?;
    let now = Utc::now().fixed_offset();

    let role = roles::ActiveModel {
        id: Set(Uuid::new_v4()),
        name: Set(req.name),
        description: Set(req.description.unwrap_or_default()),
        is_system: Set(false),
        created_at: Set(now),
        updated_at: Set(now),
    }
    .insert(&txn)
    .await?;

    replace_role_permissions(&txn, role.id, &req.permission_ids).await?;
    txn.commit().await?;

    build_role_detail(db, role).await
}

pub async fn update_role(
    db: &DatabaseConnection,
    id: Uuid,
    req: UpdateRoleRequest,
) -> Result<RoleDetail, AuthError> {
    let role = roles::Entity::find_by_id(id)
        .one(db)
        .await?
        .ok_or(AuthError::NotFound)?;

    if role.is_system && req.name.is_some() {
        return Err(AuthError::Forbidden);
    }

    let txn = db.begin().await?;
    let mut active: roles::ActiveModel = role.into();

    if let Some(name) = req.name {
        active.name = Set(name);
    }
    if let Some(description) = req.description {
        active.description = Set(description);
    }
    active.updated_at = Set(Utc::now().fixed_offset());

    let role = active.update(&txn).await?;

    if let Some(permission_ids) = req.permission_ids {
        replace_role_permissions(&txn, id, &permission_ids).await?;
    }

    txn.commit().await?;
    build_role_detail(db, role).await
}

pub async fn delete_role(db: &DatabaseConnection, id: Uuid) -> Result<(), AuthError> {
    let role = roles::Entity::find_by_id(id)
        .one(db)
        .await?
        .ok_or(AuthError::NotFound)?;

    if role.is_system {
        return Err(AuthError::Forbidden);
    }

    roles::Entity::delete_by_id(id).exec(db).await?;
    Ok(())
}

pub async fn update_role_permissions(
    db: &DatabaseConnection,
    id: Uuid,
    permission_ids: Vec<Uuid>,
) -> Result<RoleDetail, AuthError> {
    let role = roles::Entity::find_by_id(id)
        .one(db)
        .await?
        .ok_or(AuthError::NotFound)?;

    let txn = db.begin().await?;
    replace_role_permissions(&txn, id, &permission_ids).await?;
    txn.commit().await?;

    build_role_detail(db, role).await
}

pub async fn list_permissions_grouped(
    db: &DatabaseConnection,
) -> Result<Vec<PermissionGroup>, AuthError> {
    let items = permissions::Entity::find()
        .order_by_asc(permissions::Column::Resource)
        .order_by_asc(permissions::Column::Action)
        .all(db)
        .await?;

    let mut groups: Vec<PermissionGroup> = Vec::new();
    for item in items {
        let permission = PermissionItem {
            id: item.id,
            code: item.code.clone(),
            resource: item.resource.clone(),
            action: item.action.clone(),
            description: item.description.clone(),
        };

        if let Some(group) = groups.iter_mut().find(|g| g.resource == item.resource) {
            group.permissions.push(permission);
        } else {
            groups.push(PermissionGroup {
                resource: item.resource,
                permissions: vec![permission],
            });
        }
    }

    Ok(groups)
}

async fn build_role_detail(
    db: &DatabaseConnection,
    role: roles::Model,
) -> Result<RoleDetail, AuthError> {
    let role_perm_rows = role_permissions::Entity::find()
        .filter(role_permissions::Column::RoleId.eq(role.id))
        .all(db)
        .await?;

    let permission_ids: Vec<Uuid> = role_perm_rows
        .iter()
        .map(|row| row.permission_id)
        .collect();

    let permissions = if permission_ids.is_empty() {
        Vec::new()
    } else {
        permissions::Entity::find()
            .filter(permissions::Column::Id.is_in(permission_ids))
            .order_by_asc(permissions::Column::Code)
            .all(db)
            .await?
    };

    Ok(RoleDetail {
        id: role.id,
        name: role.name,
        description: role.description,
        is_system: role.is_system,
        permissions: permissions
            .into_iter()
            .map(|item| PermissionItem {
                id: item.id,
                code: item.code,
                resource: item.resource,
                action: item.action,
                description: item.description,
            })
            .collect(),
    })
}

async fn replace_role_permissions(
    db: &impl sea_orm::ConnectionTrait,
    role_id: Uuid,
    permission_ids: &[Uuid],
) -> Result<(), AuthError> {
    role_permissions::Entity::delete_many()
        .filter(role_permissions::Column::RoleId.eq(role_id))
        .exec(db)
        .await?;

    for permission_id in permission_ids {
        role_permissions::ActiveModel {
            role_id: Set(role_id),
            permission_id: Set(*permission_id),
        }
        .insert(db)
        .await?;
    }

    Ok(())
}

#[derive(Debug, serde::Serialize)]
pub struct PermissionGroup {
    pub resource: String,
    pub permissions: Vec<PermissionItem>,
}
