use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryOrder, Set,
};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::entity::dashboards;
use crate::models::{CreateDashboardRequest, DashboardDto, DashboardSummaryDto, UpdateDashboardRequest};
use crate::services::auth::AuthError;

fn to_dto(model: dashboards::Model) -> DashboardDto {
    DashboardDto {
        id: model.id,
        title: model.title,
        description: model.description,
        panels: model.panels,
        variables: model.variables,
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
        created_at: model.created_at.to_rfc3339(),
        updated_at: model.updated_at.to_rfc3339(),
    }
}

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
    let variables = req.variables.unwrap_or_else(|| json!({ "date": "2026-05-13" }));

    let model = dashboards::ActiveModel {
        id: Set(Uuid::new_v4()),
        title: Set(req.title),
        description: Set(req.description),
        panels: Set(panels),
        variables: Set(variables),
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
    active.updated_at = Set(Utc::now().fixed_offset());

    let model = active.update(db).await?;
    Ok(to_dto(model))
}

pub async fn delete_dashboard(db: &DatabaseConnection, id: Uuid) -> Result<(), AuthError> {
    dashboards::Entity::delete_by_id(id).exec(db).await?;
    Ok(())
}

pub fn default_panel(chart_type: &str) -> Value {
    match chart_type {
        "bar" => json!({
            "tooltip": { "trigger": "axis" },
            "grid": { "left": 80, "right": 20, "top": 20, "bottom": 30 },
            "xAxis": { "type": "category", "data": ["A", "B", "C"] },
            "yAxis": { "type": "value" },
            "series": [{ "type": "bar", "data": [10, 20, 30], "itemStyle": { "color": "#1677ff" } }]
        }),
        "table" => json!({
            "data": [
                { "节点类型": "示例", "指标名称": "示例指标", "当前值": "0" }
            ]
        }),
        _ => json!({
            "tooltip": { "trigger": "axis" },
            "legend": { "bottom": 0 },
            "xAxis": { "type": "category", "data": ["1月", "2月", "3月"] },
            "yAxis": { "type": "value" },
            "series": [{ "type": "line", "data": [10, 20, 15], "smooth": true }]
        }),
    }
}
