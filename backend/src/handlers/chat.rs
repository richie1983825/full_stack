use actix_web::{web, HttpRequest, HttpResponse};
use uuid::Uuid;

use crate::app_middleware::auth::get_user_id;
use crate::handlers::AppState;
use crate::models::{ApiResponse, DashboardChatRequest};
use crate::services::{
    ai_chat,
    auth::{get_user_profile, has_permission},
};

async fn require_dashboard_write(
    state: &AppState,
    req: &HttpRequest,
) -> Result<(), HttpResponse> {
    let user_id = get_user_id(req).ok_or_else(unauthorized)?;
    let profile = get_user_profile(&state.db, user_id)
        .await
        .map_err(|_| unauthorized())?;
    if !has_permission(&profile, "dashboards:write") {
        return Err(forbidden());
    }
    Ok(())
}

fn unauthorized() -> HttpResponse {
    HttpResponse::Unauthorized().json(ApiResponse::<serde_json::Value>::error(
        "10003",
        "unauthorized",
    ))
}

fn forbidden() -> HttpResponse {
    HttpResponse::Forbidden().json(ApiResponse::<serde_json::Value>::error(
        "10005",
        "permission denied",
    ))
}

pub async fn dashboard_chat_handler(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<Uuid>,
    body: web::Json<DashboardChatRequest>,
) -> HttpResponse {
    if let Err(resp) = require_dashboard_write(&state, &req).await {
        return resp;
    }

    let dashboard_id = path.into_inner();
    match ai_chat::dashboard_chat(&state.db, &state.cfg, dashboard_id, body.into_inner()).await {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::success(data)),
        Err(err) => {
            let status = err.http_status();
            HttpResponse::build(status).json(ApiResponse::<serde_json::Value>::error(
                err.error_code(),
                &err.to_string(),
            ))
        }
    }
}
