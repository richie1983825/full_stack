use actix_web::{web, HttpRequest, HttpResponse};
use uuid::Uuid;

use crate::handlers::AppState;
use crate::app_middleware::auth::get_user_id;
use crate::models::{
    ApiResponse, CreateRoleRequest, CreateUserRequest, UpdateRolePermissionsRequest,
    UpdateRoleRequest, UpdateUserRequest,
};
use crate::services::{
    auth::{self, get_user_profile, has_permission, list_permissions as list_all_permissions, AuthError},
    roles::{self, PermissionGroup, RoleDetail},
    users,
};
use crate::models::UserProfile;

async fn require_permission(
    state: &AppState,
    req: &HttpRequest,
    code: &str,
) -> Result<UserProfile, HttpResponse> {
    let user_id = get_user_id(req).ok_or_else(|| {
        HttpResponse::Unauthorized().json(ApiResponse::<serde_json::Value>::error(
            "10003",
            "unauthorized",
        ))
    })?;

    let profile = get_user_profile(&state.db, user_id)
        .await
        .map_err(|e| {
            HttpResponse::Unauthorized().json(ApiResponse::<serde_json::Value>::error(
                "10003",
                &e.to_string(),
            ))
        })?;

    if !has_permission(&profile, code) {
        return Err(HttpResponse::Forbidden().json(ApiResponse::<serde_json::Value>::error(
            "10005",
            "permission denied",
        )));
    }

    Ok(profile)
}

fn map_error(err: AuthError) -> HttpResponse {
    let (mut status, code) = match err {
        AuthError::NotFound => (HttpResponse::NotFound(), "10004"),
        AuthError::Forbidden => (HttpResponse::Forbidden(), "10005"),
        _ => (HttpResponse::BadRequest(), "10006"),
    };
    status.json(ApiResponse::<serde_json::Value>::error(code, &err.to_string()))
}

pub async fn list_users(state: web::Data<AppState>, req: HttpRequest) -> HttpResponse {
    if let Err(resp) = require_permission(&state, &req, "users:read").await {
        return resp;
    }

    match users::list_users(&state.db).await {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::success(data)),
        Err(e) => map_error(e),
    }
}

pub async fn get_user(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> HttpResponse {
    if let Err(resp) = require_permission(&state, &req, "users:read").await {
        return resp;
    }

    match users::get_user(&state.db, path.into_inner()).await {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::success(data)),
        Err(e) => map_error(e),
    }
}

pub async fn create_user(
    state: web::Data<AppState>,
    req: HttpRequest,
    body: web::Json<CreateUserRequest>,
) -> HttpResponse {
    if let Err(resp) = require_permission(&state, &req, "users:write").await {
        return resp;
    }

    match users::create_user(&state.db, body.into_inner()).await {
        Ok(data) => HttpResponse::Created().json(ApiResponse::success(data)),
        Err(e) => map_error(e),
    }
}

pub async fn update_user(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<Uuid>,
    body: web::Json<UpdateUserRequest>,
) -> HttpResponse {
    if let Err(resp) = require_permission(&state, &req, "users:write").await {
        return resp;
    }

    match users::update_user(&state.db, path.into_inner(), body.into_inner()).await {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::success(data)),
        Err(e) => map_error(e),
    }
}

pub async fn delete_user(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> HttpResponse {
    if let Err(resp) = require_permission(&state, &req, "users:admin").await {
        return resp;
    }

    match users::delete_user(&state.db, path.into_inner()).await {
        Ok(()) => HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({"deleted": true}))),
        Err(e) => map_error(e),
    }
}

pub async fn list_roles(state: web::Data<AppState>, req: HttpRequest) -> HttpResponse {
    if let Err(resp) = require_permission(&state, &req, "roles:read").await {
        return resp;
    }

    match roles::list_roles(&state.db).await {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::success(data)),
        Err(e) => map_error(e),
    }
}

pub async fn get_role(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> HttpResponse {
    if let Err(resp) = require_permission(&state, &req, "roles:read").await {
        return resp;
    }

    match roles::get_role(&state.db, path.into_inner()).await {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::success(data)),
        Err(e) => map_error(e),
    }
}

pub async fn create_role(
    state: web::Data<AppState>,
    req: HttpRequest,
    body: web::Json<CreateRoleRequest>,
) -> HttpResponse {
    if let Err(resp) = require_permission(&state, &req, "roles:write").await {
        return resp;
    }

    match roles::create_role(&state.db, body.into_inner()).await {
        Ok(data) => HttpResponse::Created().json(ApiResponse::success(data)),
        Err(e) => map_error(e),
    }
}

pub async fn update_role(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<Uuid>,
    body: web::Json<UpdateRoleRequest>,
) -> HttpResponse {
    if let Err(resp) = require_permission(&state, &req, "roles:write").await {
        return resp;
    }

    match roles::update_role(&state.db, path.into_inner(), body.into_inner()).await {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::success(data)),
        Err(e) => map_error(e),
    }
}

pub async fn delete_role(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> HttpResponse {
    if let Err(resp) = require_permission(&state, &req, "roles:write").await {
        return resp;
    }

    match roles::delete_role(&state.db, path.into_inner()).await {
        Ok(()) => HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({"deleted": true}))),
        Err(e) => map_error(e),
    }
}

pub async fn list_permissions_handler(
    state: web::Data<AppState>,
    req: HttpRequest,
) -> HttpResponse {
    if let Err(resp) = require_permission(&state, &req, "roles:read").await {
        return resp;
    }

    match list_all_permissions(&state.db).await {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::success(data)),
        Err(e) => map_error(e),
    }
}

pub async fn list_permissions_grouped(
    state: web::Data<AppState>,
    req: HttpRequest,
) -> HttpResponse {
    if let Err(resp) = require_permission(&state, &req, "roles:read").await {
        return resp;
    }

    match roles::list_permissions_grouped(&state.db).await {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::<Vec<PermissionGroup>>::success(data)),
        Err(e) => map_error(e),
    }
}

pub async fn update_role_permissions(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<Uuid>,
    body: web::Json<UpdateRolePermissionsRequest>,
) -> HttpResponse {
    if let Err(resp) = require_permission(&state, &req, "roles:write").await {
        return resp;
    }

    match roles::update_role_permissions(&state.db, path.into_inner(), body.permission_ids.clone())
        .await
    {
        Ok(data) => HttpResponse::Ok().json(ApiResponse::<RoleDetail>::success(data)),
        Err(e) => map_error(e),
    }
}
