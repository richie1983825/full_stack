use actix_web::{web, HttpRequest, HttpResponse};
use uuid::Uuid;

use crate::app_middleware::auth::get_user_id;
use crate::handlers::AppState;
use crate::models::{
    ApiResponse, CreateDatasourceRequest, UpdateDatasourceRequest,
};
use crate::services::{auth, datasources};

async fn require_auth(
    state: &AppState,
    req: &HttpRequest,
) -> Result<(), HttpResponse> {
    let user_id = get_user_id(req).ok_or_else(|| {
        HttpResponse::Unauthorized().json(ApiResponse::<serde_json::Value>::error(
            "10003",
            "unauthorized",
        ))
    })?;

    // Just verify the user exists
    auth::get_user_profile(&state.db, user_id)
        .await
        .map_err(|_| {
            HttpResponse::Unauthorized().json(ApiResponse::<serde_json::Value>::error(
                "10003",
                "unauthorized",
            ))
        })?;

    Ok(())
}

fn err_resp(code: &str, msg: &str) -> HttpResponse {
    HttpResponse::InternalServerError()
        .json(ApiResponse::<serde_json::Value>::error(code, msg))
}

fn not_found_resp(msg: &str) -> HttpResponse {
    HttpResponse::NotFound()
        .json(ApiResponse::<serde_json::Value>::error("10004", msg))
}

fn bad_request_resp(code: &str, msg: &str) -> HttpResponse {
    HttpResponse::BadRequest()
        .json(ApiResponse::<serde_json::Value>::error(code, msg))
}

pub async fn list_datasources_handler(
    state: web::Data<AppState>,
    req: HttpRequest,
) -> HttpResponse {
    if let Err(resp) = require_auth(&state, &req).await {
        return resp;
    }

    match datasources::list_datasources(&state.db).await {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::success(data)),
        Err(e) => err_resp("20001", &e),
    }
}

pub async fn get_datasource_handler(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> HttpResponse {
    if let Err(resp) = require_auth(&state, &req).await {
        return resp;
    }

    match datasources::get_datasource(&state.db, path.into_inner()).await {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::success(data)),
        Err(e) => not_found_resp(&e),
    }
}

pub async fn create_datasource_handler(
    state: web::Data<AppState>,
    req: HttpRequest,
    body: web::Json<CreateDatasourceRequest>,
) -> HttpResponse {
    if let Err(resp) = require_auth(&state, &req).await {
        return resp;
    }

    match datasources::create_datasource(&state.db, &state.cfg, body.into_inner()).await {
        Ok(data) => HttpResponse::Created().json(ApiResponse::success(data)),
        Err(e) => err_resp("20001", &e),
    }
}

pub async fn update_datasource_handler(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<Uuid>,
    body: web::Json<UpdateDatasourceRequest>,
) -> HttpResponse {
    if let Err(resp) = require_auth(&state, &req).await {
        return resp;
    }

    match datasources::update_datasource(&state.db, &state.cfg, path.into_inner(), body.into_inner()).await {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::success(data)),
        Err(e) => err_resp("20001", &e),
    }
}

pub async fn delete_datasource_handler(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> HttpResponse {
    if let Err(resp) = require_auth(&state, &req).await {
        return resp;
    }

    match datasources::delete_datasource(&state.db, path.into_inner()).await {
        Ok(()) => {
            HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({"deleted": true})))
        }
        Err(e) => not_found_resp(&e),
    }
}

#[derive(serde::Deserialize)]
pub struct QueryBody {
    pub sql: String,
}

pub async fn query_datasource_handler(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<Uuid>,
    body: web::Json<QueryBody>,
) -> HttpResponse {
    if let Err(resp) = require_auth(&state, &req).await {
        return resp;
    }

    match datasources::query_datasource_sql(&state.db, &state.cfg, path.into_inner(), &body.sql).await {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::success(data)),
        Err(e) => bad_request_resp("20001", &e),
    }
}

pub async fn list_tables_handler(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> HttpResponse {
    if let Err(resp) = require_auth(&state, &req).await {
        return resp;
    }

    match datasources::list_tables(&state.db, &state.cfg, path.into_inner()).await {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::success(data)),
        Err(e) => bad_request_resp("20001", &e),
    }
}

pub async fn list_columns_handler(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<(Uuid, String)>,
) -> HttpResponse {
    if let Err(resp) = require_auth(&state, &req).await {
        return resp;
    }

    let (id, table) = path.into_inner();
    match datasources::list_columns(&state.db, &state.cfg, id, &table).await {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::success(data)),
        Err(e) => bad_request_resp("20001", &e),
    }
}
