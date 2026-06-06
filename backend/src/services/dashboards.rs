use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, Set,
};
use serde_json::json;
use uuid::Uuid;

use crate::entity::dashboards;
use crate::models::{CreateDashboardRequest, DashboardDto, DashboardSummaryDto, MoveItemRequest, UpdateDashboardRequest};
use crate::services::auth::AuthError;

fn to_dto(model: dashboards::Model) -> DashboardDto {
    DashboardDto {
        id: model.id,
        title: model.title,
        description: model.description,
        panels: model.panels,
        variables: model.variables,
        parent_id: model.parent_id,
        kind: model.kind,
        created_at: model.created_at.to_rfc3339(),
        updated_at: model.updated_at.to_rfc3339(),
    }
}

fn to_summary(model: dashboards::Model) -> DashboardSummaryDto {
    let panel_count = model.panels.as_array().map(|a| a.len()).unwrap_or(0);
    DashboardSummaryDto {
        id: model.id,
        title: model.title,
        description: model.description,
        panel_count,
        parent_id: model.parent_id,
        kind: model.kind,
        created_at: model.created_at.to_rfc3339(),
        updated_at: model.updated_at.to_rfc3339(),
    }
}

/// 列出根目录下的项目（文件夹和仪表盘），parent_id IS NULL
pub async fn list_root_items(db: &DatabaseConnection) -> Result<Vec<DashboardSummaryDto>, AuthError> {
    let rows = dashboards::Entity::find()
        .filter(dashboards::Column::ParentId.is_null())
        .order_by_asc(dashboards::Column::Kind)
        .order_by_asc(dashboards::Column::Title)
        .all(db)
        .await?;
    Ok(rows.into_iter().map(to_summary).collect())
}

/// 列出指定文件夹下的子项目
pub async fn list_children(db: &DatabaseConnection, parent_id: Uuid) -> Result<Vec<DashboardSummaryDto>, AuthError> {
    let rows = dashboards::Entity::find()
        .filter(dashboards::Column::ParentId.eq(parent_id))
        .order_by_asc(dashboards::Column::Kind)
        .order_by_asc(dashboards::Column::Title)
        .all(db)
        .await?;
    Ok(rows.into_iter().map(to_summary).collect())
}

/// 列出所有项目（兼容旧 API）
pub async fn list_dashboards(db: &DatabaseConnection) -> Result<Vec<DashboardSummaryDto>, AuthError> {
    let rows = dashboards::Entity::find()
        .order_by_desc(dashboards::Column::UpdatedAt)
        .all(db)
        .await?;
    Ok(rows.into_iter().map(to_summary).collect())
}

pub async fn get_dashboard(db: &DatabaseConnection, id: Uuid) -> Result<DashboardDto, AuthError> {
    let row = dashboards::Entity::find_by_id(id)
        .one(db)
        .await?
        .ok_or(AuthError::NotFound)?;
    Ok(to_dto(row))
}

pub async fn create_dashboard(
    db: &DatabaseConnection,
    req: CreateDashboardRequest,
) -> Result<DashboardDto, AuthError> {
    let now = Utc::now().fixed_offset();
    let panels = req.panels.unwrap_or_else(|| json!([]));
    let variables = req.variables.unwrap_or_else(|| json!({}));
    let kind = req.kind.unwrap_or_else(|| "dashboard".into());

    let model = dashboards::ActiveModel {
        id: Set(Uuid::new_v4()),
        title: Set(req.title),
        description: Set(req.description),
        panels: Set(panels),
        variables: Set(variables),
        parent_id: Set(req.parent_id),
        kind: Set(kind),
        created_at: Set(now),
        updated_at: Set(now),
    }
    .insert(db)
    .await?;

    Ok(to_dto(model))
}

pub async fn update_dashboard(
    db: &DatabaseConnection,
    id: Uuid,
    req: UpdateDashboardRequest,
) -> Result<DashboardDto, AuthError> {
    let existing = dashboards::Entity::find_by_id(id)
        .one(db)
        .await?
        .ok_or(AuthError::NotFound)?;

    let mut active: dashboards::ActiveModel = existing.into();

    if let Some(title) = req.title {
        active.title = Set(title);
    }
    if let Some(description) = req.description {
        active.description = Set(Some(description));
    }
    if let Some(panels) = req.panels {
        active.panels = Set(panels);
    }
    if let Some(variables) = req.variables {
        active.variables = Set(variables);
    }
    if req.parent_id.is_some() {
        active.parent_id = Set(req.parent_id);
    }
    active.updated_at = Set(Utc::now().fixed_offset());

    let model = active.update(db).await?;
    Ok(to_dto(model))
}

pub async fn delete_dashboard(db: &DatabaseConnection, id: Uuid) -> Result<(), AuthError> {
    // Also delete children (folders contain their items)
    let children = dashboards::Entity::find()
        .filter(dashboards::Column::ParentId.eq(id))
        .all(db)
        .await?;
    for child in children {
        Box::pin(delete_dashboard(db, child.id)).await?;
    }
    dashboards::Entity::delete_by_id(id).exec(db).await?;
    Ok(())
}

/// 移动项目到指定父文件夹（parent_id = null 表示根目录）
pub async fn move_item(
    db: &DatabaseConnection,
    id: Uuid,
    req: MoveItemRequest,
) -> Result<DashboardDto, AuthError> {
    let existing = dashboards::Entity::find_by_id(id)
        .one(db)
        .await?
        .ok_or(AuthError::NotFound)?;

    let mut active: dashboards::ActiveModel = existing.into();
    active.parent_id = Set(req.parent_id);
    active.updated_at = Set(Utc::now().fixed_offset());

    let model = active.update(db).await?;
    Ok(to_dto(model))
}
