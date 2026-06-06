use actix_web::{web, HttpRequest, HttpResponse};
use uuid::Uuid;

use crate::app_middleware::auth::get_user_id;
use crate::handlers::AppState;
use crate::models::{
    ApiResponse, CreateSnapshotRequest, UpsertScheduleRequest,
};
use crate::services::{
    auth::{get_user_profile, has_permission, AuthError},
    snapshots,
};

async fn require_dashboard_read(state: &AppState, req: &HttpRequest) -> Result<(), HttpResponse> {
    let user_id = get_user_id(req).ok_or_else(unauthorized)?;
    let profile = get_user_profile(&state.db, user_id)
        .await
        .map_err(|_| unauthorized())?;
    if !has_permission(&profile, "dashboards:read") {
        return Err(forbidden());
    }
    Ok(())
}

fn unauthorized() -> HttpResponse {
    HttpResponse::Unauthorized().json(ApiResponse::<serde_json::Value>::error("10003", "unauthorized"))
}

fn forbidden() -> HttpResponse {
    HttpResponse::Forbidden().json(ApiResponse::<serde_json::Value>::error("10005", "permission denied"))
}

fn map_error(err: AuthError) -> HttpResponse {
    let (mut status, code) = match &err {
        AuthError::NotFound => (HttpResponse::NotFound(), "10004"),
        _ => (HttpResponse::InternalServerError(), "10006"),
    };
    status.json(ApiResponse::<serde_json::Value>::error(code, &err.to_string()))
}

pub async fn list_snapshots(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> HttpResponse {
    if let Err(resp) = require_dashboard_read(&state, &req).await {
        return resp;
    }
    match snapshots::list_snapshots(&state.db, &state.cfg, path.into_inner()).await {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::success(data)),
        Err(e) => map_error(e),
    }
}

pub async fn create_snapshot(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<Uuid>,
    body: web::Json<CreateSnapshotRequest>,
) -> HttpResponse {
    if let Err(resp) = require_dashboard_read(&state, &req).await {
        return resp;
    }
    let user_id = get_user_id(&req);
    match snapshots::create_snapshot(
        &state.db,
        &state.cfg,
        path.into_inner(),
        body.into_inner(),
        user_id,
        None,
    )
    .await
    {
        Ok(data) => HttpResponse::Created().json(ApiResponse::success(data)),
        Err(e) => map_error(e),
    }
}

pub async fn delete_snapshot(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<(Uuid, Uuid)>,
) -> HttpResponse {
    if let Err(resp) = require_dashboard_read(&state, &req).await {
        return resp;
    }
    let (dashboard_id, snapshot_id) = path.into_inner();
    match snapshots::delete_snapshot(&state.db, dashboard_id, snapshot_id).await {
        Ok(()) => HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({"deleted": true}))),
        Err(e) => map_error(e),
    }
}

pub async fn view_snapshot_html(
    state: web::Data<AppState>,
    path: web::Path<String>,
) -> HttpResponse {
    match snapshots::read_snapshot_html(&state.db, &path.into_inner()).await {
        Ok(html) => HttpResponse::Ok()
            .content_type("text/html; charset=utf-8")
            .body(html),
        Err(AuthError::NotFound) => HttpResponse::NotFound().body("snapshot not found or expired"),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

pub async fn get_schedule(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> HttpResponse {
    if let Err(resp) = require_dashboard_read(&state, &req).await {
        return resp;
    }
    match snapshots::get_schedule(&state.db, path.into_inner()).await {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::success(data)),
        Err(e) => map_error(e),
    }
}

pub async fn upsert_schedule(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<Uuid>,
    body: web::Json<UpsertScheduleRequest>,
) -> HttpResponse {
    if let Err(resp) = require_dashboard_read(&state, &req).await {
        return resp;
    }
    match snapshots::upsert_schedule(&state.db, path.into_inner(), body.into_inner()).await {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::success(data)),
        Err(e) => map_error(e),
    }
}
