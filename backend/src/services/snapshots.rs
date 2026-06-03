use std::path::PathBuf;

use chrono::{Duration, Utc};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, Set,
};
use serde_json::json;
use uuid::Uuid;

use crate::config::Config;
use crate::entity::{dashboard_schedules, dashboard_snapshots, dashboards};
use crate::models::{
    CreateSnapshotRequest, ScheduleDto, SnapshotDto, UpsertScheduleRequest,
};
use crate::services::auth::AuthError;
use crate::services::metrics;
use crate::services::panel_hydrate::{hydrate_panels_for_snapshot, resolve_snapshot_date};
use crate::services::snapshot_html::render_snapshot_html;

fn new_snapshot_key() -> String {
    Uuid::new_v4().to_string().replace('-', "")[..16].to_string()
}

fn snapshot_view_url(cfg: &Config, key: &str) -> String {
    format!("{}/snapshots/{}", cfg.public_base_url.trim_end_matches('/'), key)
}

fn ensure_snapshot_dir(cfg: &Config) -> Result<PathBuf, AuthError> {
    let dir = PathBuf::from(&cfg.snapshot_dir);
    std::fs::create_dir_all(&dir).map_err(|e| AuthError::Internal(e.to_string()))?;
    Ok(dir)
}

pub async fn create_snapshot(
    db: &DatabaseConnection,
    cfg: &Config,
    dashboard_id: Uuid,
    req: CreateSnapshotRequest,
    created_by: Option<Uuid>,
    date_mode: Option<&str>,
) -> Result<SnapshotDto, AuthError> {
    let dashboard = dashboards::Entity::find_by_id(dashboard_id)
        .one(db)
        .await?
        .ok_or(AuthError::NotFound)?;

    let mode = date_mode.unwrap_or("dashboard");
    let mut variables = dashboard.variables.clone();
    let date = resolve_snapshot_date(&variables, mode);
    if let Some(obj) = variables.as_object_mut() {
        obj.insert("date".into(), json!(date));
    }

    let metrics = metrics::query_network_metrics(db, &date)
        .await
        .map_err(|e| AuthError::Internal(e.to_string()))?;

    let panels = hydrate_panels_for_snapshot(&dashboard.panels, &metrics);
    let generated_at = Utc::now().format("%Y-%m-%d %H:%M:%S UTC").to_string();
    let snapshot_title = req
        .title
        .filter(|t| !t.trim().is_empty())
        .unwrap_or_else(|| format!("{} · {}", dashboard.title, date));

    let html = render_snapshot_html(&snapshot_title, &variables, &panels, &generated_at);

    let key = new_snapshot_key();
    let dir = ensure_snapshot_dir(cfg)?;
    let file_name = format!("{key}.html");
    let html_path = dir.join(&file_name);
    std::fs::write(&html_path, html).map_err(|e| AuthError::Internal(e.to_string()))?;

    let now = Utc::now().fixed_offset();
    let expires_at = req.expires_hours.map(|hours| now + Duration::hours(hours));
    let id = Uuid::new_v4();

    let model = dashboard_snapshots::ActiveModel {
        id: Set(id),
        dashboard_id: Set(dashboard_id),
        snapshot_key: Set(key.clone()),
        title: Set(snapshot_title.clone()),
        variables: Set(variables.clone()),
        panels: Set(panels),
        html_path: Set(html_path.to_string_lossy().into_owned()),
        created_by: Set(created_by),
        created_at: Set(now),
        expires_at: Set(expires_at),
    }
    .insert(db)
    .await?;

    Ok(to_snapshot_dto(model, cfg))
}

pub async fn list_snapshots(
    db: &DatabaseConnection,
    cfg: &Config,
    dashboard_id: Uuid,
) -> Result<Vec<SnapshotDto>, AuthError> {
    let rows = dashboard_snapshots::Entity::find()
        .filter(dashboard_snapshots::Column::DashboardId.eq(dashboard_id))
        .order_by_desc(dashboard_snapshots::Column::CreatedAt)
        .all(db)
        .await?;

    Ok(rows.into_iter().map(|m| to_snapshot_dto(m, cfg)).collect())
}

pub async fn read_snapshot_html(
    db: &DatabaseConnection,
    key: &str,
) -> Result<String, AuthError> {
    let row = dashboard_snapshots::Entity::find()
        .filter(dashboard_snapshots::Column::SnapshotKey.eq(key))
        .one(db)
        .await?
        .ok_or(AuthError::NotFound)?;

    if let Some(expires) = row.expires_at {
        if expires < Utc::now().fixed_offset() {
            return Err(AuthError::NotFound);
        }
    }

    std::fs::read_to_string(&row.html_path).map_err(|_| AuthError::NotFound)
}

pub async fn delete_snapshot(
    db: &DatabaseConnection,
    dashboard_id: Uuid,
    snapshot_id: Uuid,
) -> Result<(), AuthError> {
    let row = dashboard_snapshots::Entity::find_by_id(snapshot_id)
        .filter(dashboard_snapshots::Column::DashboardId.eq(dashboard_id))
        .one(db)
        .await?
        .ok_or(AuthError::NotFound)?;

    if !row.html_path.is_empty() {
        let _ = std::fs::remove_file(&row.html_path);
    }

    dashboard_snapshots::Entity::delete_by_id(snapshot_id)
        .exec(db)
        .await?;

    Ok(())
}

pub async fn get_schedule(
    db: &DatabaseConnection,
    dashboard_id: Uuid,
) -> Result<Option<ScheduleDto>, AuthError> {
    let row = dashboard_schedules::Entity::find()
        .filter(dashboard_schedules::Column::DashboardId.eq(dashboard_id))
        .one(db)
        .await?;

    Ok(row.map(to_schedule_dto))
}

pub async fn upsert_schedule(
    db: &DatabaseConnection,
    dashboard_id: Uuid,
    req: UpsertScheduleRequest,
) -> Result<ScheduleDto, AuthError> {
    dashboards::Entity::find_by_id(dashboard_id)
        .one(db)
        .await?
        .ok_or(AuthError::NotFound)?;

    if req.interval_hours < 1 {
        return Err(AuthError::Validation("intervalHours must be >= 1".into()));
    }

    let valid_modes = ["dashboard", "today", "yesterday"];
    if !valid_modes.contains(&req.date_mode.as_str()) {
        return Err(AuthError::Validation("invalid dateMode".into()));
    }

    let now = Utc::now().fixed_offset();
    let next_run = if req.enabled {
        Some(now)
    } else {
        None
    };

    let existing = dashboard_schedules::Entity::find()
        .filter(dashboard_schedules::Column::DashboardId.eq(dashboard_id))
        .one(db)
        .await?;

    let model = if let Some(row) = existing {
        let mut active: dashboard_schedules::ActiveModel = row.into();
        active.enabled = Set(req.enabled);
        active.interval_hours = Set(req.interval_hours);
        active.date_mode = Set(req.date_mode);
        active.updated_at = Set(now);
        if req.enabled {
            active.next_run_at = Set(next_run);
        }
        active.update(db).await?
    } else {
        dashboard_schedules::ActiveModel {
            id: Set(Uuid::new_v4()),
            dashboard_id: Set(dashboard_id),
            enabled: Set(req.enabled),
            interval_hours: Set(req.interval_hours),
            date_mode: Set(req.date_mode),
            last_run_at: Set(None),
            next_run_at: Set(next_run),
            created_at: Set(now),
            updated_at: Set(now),
        }
        .insert(db)
        .await?
    };

    Ok(to_schedule_dto(model))
}

pub async fn run_due_schedules(db: &DatabaseConnection, cfg: &Config) -> Result<(), AuthError> {
    let now = Utc::now().fixed_offset();
    let due = dashboard_schedules::Entity::find()
        .filter(dashboard_schedules::Column::Enabled.eq(true))
        .filter(
            dashboard_schedules::Column::NextRunAt
                .lte(now)
                .or(dashboard_schedules::Column::NextRunAt.is_null()),
        )
        .all(db)
        .await?;

    for schedule in due {
        let date_mode = schedule.date_mode.clone();
        let dashboard_id = schedule.dashboard_id;
        let interval = schedule.interval_hours;

        let result = create_snapshot(
            db,
            cfg,
            dashboard_id,
            CreateSnapshotRequest {
                title: None,
                expires_hours: None,
            },
            None,
            Some(&date_mode),
        )
        .await;

        match result {
            Ok(snapshot) => {
                log::info!(
                    "scheduled snapshot created for dashboard {}: {}",
                    dashboard_id,
                    snapshot.snapshot_key
                );
            }
            Err(e) => {
                log::error!(
                    "scheduled snapshot failed for dashboard {}: {}",
                    dashboard_id,
                    e
                );
            }
        }

        let mut active: dashboard_schedules::ActiveModel = schedule.into();
        active.last_run_at = Set(Some(now));
        active.next_run_at = Set(Some(now + Duration::hours(interval as i64)));
        active.updated_at = Set(now);
        let _ = active.update(db).await;
    }

    Ok(())
}

fn to_snapshot_dto(model: dashboard_snapshots::Model, cfg: &Config) -> SnapshotDto {
    SnapshotDto {
        id: model.id,
        dashboard_id: model.dashboard_id,
        snapshot_key: model.snapshot_key.clone(),
        title: model.title,
        variables: model.variables,
        view_url: snapshot_view_url(cfg, &model.snapshot_key),
        created_at: model.created_at.to_rfc3339(),
        expires_at: model.expires_at.map(|t| t.to_rfc3339()),
    }
}

fn to_schedule_dto(model: dashboard_schedules::Model) -> ScheduleDto {
    ScheduleDto {
        id: model.id,
        dashboard_id: model.dashboard_id,
        enabled: model.enabled,
        interval_hours: model.interval_hours,
        date_mode: model.date_mode,
        last_run_at: model.last_run_at.map(|t| t.to_rfc3339()),
        next_run_at: model.next_run_at.map(|t| t.to_rfc3339()),
    }
}
