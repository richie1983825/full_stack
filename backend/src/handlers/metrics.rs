use actix_web::{web, HttpRequest, HttpResponse};
use sea_orm::DatabaseConnection;

use crate::config::Config;
use crate::app_middleware::auth::get_user_id;
use crate::models::{ApiResponse, LoginRequest};
use crate::services::{auth as auth_service, metrics as metrics_service};

pub struct AppState {
    pub db: DatabaseConnection,
    pub cfg: Config,
}

pub async fn business_systems(state: web::Data<AppState>) -> HttpResponse {
    match metrics_service::query_business_systems(&state.db).await {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::success(data)),
        Err(e) => {
            log::error!("query_business_systems error: {}", e);
            let resp: ApiResponse<serde_json::Value> =
                ApiResponse::error("20001", &format!("database error: {e}"));
            HttpResponse::InternalServerError().json(resp)
        }
    }
}

pub async fn login(
    state: web::Data<AppState>,
    body: web::Json<LoginRequest>,
) -> HttpResponse {
    match auth_service::login(&state.db, &state.cfg, body.into_inner()).await {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::success(data)),
        Err(e) => {
            let resp = ApiResponse::<serde_json::Value>::error("10002", &e.to_string());
            HttpResponse::Unauthorized().json(resp)
        }
    }
}

pub async fn me(state: web::Data<AppState>, req: HttpRequest) -> HttpResponse {
    let user_id = match get_user_id(&req) {
        Some(id) => id,
        None => {
            return HttpResponse::Unauthorized()
                .json(ApiResponse::<serde_json::Value>::error("10003", "unauthorized"));
        }
    };

    match auth_service::get_user_profile(&state.db, user_id).await {
        Ok(profile) => HttpResponse::Ok().json(ApiResponse::success(profile)),
        Err(e) => HttpResponse::NotFound().json(ApiResponse::<serde_json::Value>::error(
            "10004",
            &e.to_string(),
        )),
    }
}
