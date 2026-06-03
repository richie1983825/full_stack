use actix_web::{web, HttpRequest, HttpResponse};
use uuid::Uuid;

use crate::handlers::AppState;
use crate::app_middleware::auth::get_user_id;
use crate::models::{
    ApiResponse, CreateDashboardRequest, UpdateDashboardRequest,
};
use crate::services::{
    auth::{get_user_profile, has_permission, AuthError},
    dashboards,
};

async fn require_dashboard_read(
    state: &AppState,
    req: &HttpRequest,
) -> Result<(), HttpResponse> {
    let user_id = get_user_id(req).ok_or_else(|| unauthorized())?;
    let profile = get_user_profile(&state.db, user_id)
        .await
        .map_err(|_| unauthorized())?;
    if !has_permission(&profile, "dashboards:read") {
        return Err(forbidden());
    }
    Ok(())
}

async fn require_dashboard_write(
    state: &AppState,
    req: &HttpRequest,
) -> Result<(), HttpResponse> {
    let user_id = get_user_id(req).ok_or_else(|| unauthorized())?;
    let profile = get_user_profile(&state.db, user_id)
        .await
        .map_err(|_| unauthorized())?;
    if !has_permission(&profile, "dashboards:write") {
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
    let (mut status, code) = match err {
        AuthError::NotFound => (HttpResponse::NotFound(), "10004"),
        _ => (HttpResponse::BadRequest(), "10006"),
    };
    status.json(ApiResponse::<serde_json::Value>::error(code, &err.to_string()))
}

pub async fn list_dashboards(state: web::Data<AppState>, req: HttpRequest) -> HttpResponse {
    if let Err(resp) = require_dashboard_read(&state, &req).await {
        return resp;
    }
    match dashboards::list_dashboards(&state.db).await {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::success(data)),
        Err(e) => map_error(e),
    }
}

pub async fn get_dashboard(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> HttpResponse {
    if let Err(resp) = require_dashboard_read(&state, &req).await {
        return resp;
    }
    match dashboards::get_dashboard(&state.db, path.into_inner()).await {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::success(data)),
        Err(e) => map_error(e),
    }
}

pub async fn create_dashboard(
    state: web::Data<AppState>,
    req: HttpRequest,
    body: web::Json<CreateDashboardRequest>,
) -> HttpResponse {
    if let Err(resp) = require_dashboard_write(&state, &req).await {
        return resp;
    }
    match dashboards::create_dashboard(&state.db, body.into_inner()).await {
        Ok(data) => HttpResponse::Created().json(ApiResponse::success(data)),
        Err(e) => map_error(e),
    }
}

pub async fn update_dashboard(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<Uuid>,
    body: web::Json<UpdateDashboardRequest>,
) -> HttpResponse {
    if let Err(resp) = require_dashboard_write(&state, &req).await {
        return resp;
    }
    match dashboards::update_dashboard(&state.db, path.into_inner(), body.into_inner()).await {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::success(data)),
        Err(e) => map_error(e),
    }
}

pub async fn delete_dashboard(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> HttpResponse {
    if let Err(resp) = require_dashboard_write(&state, &req).await {
        return resp;
    }
    match dashboards::delete_dashboard(&state.db, path.into_inner()).await {
        Ok(()) => HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({"deleted": true}))),
        Err(e) => map_error(e),
    }
}
