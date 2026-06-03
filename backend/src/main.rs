mod config;
mod db;
mod entity;
mod handlers;
mod app_middleware;
mod migration;
mod models;
mod services;

use actix_cors::Cors;
use actix_web::{web, App, HttpResponse, HttpServer};
use actix_web::middleware::Logger;
use handlers::AppState;
use log::info;
use app_middleware::auth::AuthMiddleware;

// Dashboard API: /api/dashboards/ (trailing slash route)
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv::dotenv().ok();
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));

    let cfg = config::Config::from_env();
    info!("Starting server at {}:{}", cfg.server_host, cfg.server_port);

    let db = db::create_connection(&cfg.database_url)
        .await
        .expect("Failed to create database connection");

    db::run_migrations(&db)
        .await
        .expect("Failed to run migrations");

    info!("Database connected and migrations applied");

    // 播种默认数据源（CMP 自身数据库）
    if let Err(e) = services::datasources::seed_default_datasource(&db, &cfg).await {
        log::warn!("Seed default datasource skipped: {e}");
    }

    let state = web::Data::new(AppState {
        db: db.clone(),
        cfg: cfg.clone(),
    });

    let host = cfg.server_host.clone();
    let port = cfg.server_port;
    let auth_cfg = cfg.clone();
    let scheduler_db = db.clone();
    let scheduler_cfg = cfg.clone();

    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
        loop {
            interval.tick().await;
            if let Err(e) =
                services::snapshots::run_due_schedules(&scheduler_db, &scheduler_cfg).await
            {
                log::error!("snapshot scheduler error: {}", e);
            }
        }
    });

    HttpServer::new(move || {
        let cors = Cors::permissive();
        let auth = AuthMiddleware::new(auth_cfg.clone());

        App::new()
            .wrap(cors)
            .wrap(Logger::default())
            .app_data(state.clone())
            .route("/health", web::get().to(|| async {
                HttpResponse::Ok().json(serde_json::json!({"status": "ok"}))
            }))
            .route(
                "/snapshots/{key}",
                web::get().to(handlers::view_snapshot_html),
            )
            .route(
                "/api/v1/ops_dbapi/api/network_metrics",
                web::post().to(handlers::network_metrics),
            )
            .route(
                "/api/v1/ops_dbapi/api/business_systems",
                web::post().to(handlers::business_systems),
            )
            .route("/api/auth/login", web::post().to(handlers::login))
            .service(
                web::scope("/api/dashboards")
                    .wrap(auth.clone())
                    .route("/", web::get().to(handlers::list_dashboards))
                    .route("/", web::post().to(handlers::create_dashboard))
                    .route("/{id}", web::get().to(handlers::get_dashboard))
                    .route("/{id}", web::put().to(handlers::update_dashboard))
                    .route("/{id}", web::delete().to(handlers::delete_dashboard))
                    .route("/{id}/snapshots", web::get().to(handlers::list_snapshots))
                    .route("/{id}/snapshots", web::post().to(handlers::create_snapshot))
                    .route(
                        "/{id}/snapshots/{snapshot_id}",
                        web::delete().to(handlers::delete_snapshot),
                    )
                    .route("/{id}/schedule", web::get().to(handlers::get_schedule))
                    .route("/{id}/schedule", web::put().to(handlers::upsert_schedule)),
            )
            .service(
                web::scope("/api/auth")
                    .wrap(auth.clone())
                    .route("/me", web::get().to(handlers::me)),
            )
            .route(
                "/api/datasources",
                web::get().to(handlers::list_datasources_handler)
                    .wrap(auth.clone()),
            )
            .route(
                "/api/datasources",
                web::post().to(handlers::create_datasource_handler)
                    .wrap(auth.clone()),
            )
            .route(
                "/api/datasources/{id}",
                web::get().to(handlers::get_datasource_handler)
                    .wrap(auth.clone()),
            )
            .route(
                "/api/datasources/{id}",
                web::put().to(handlers::update_datasource_handler)
                    .wrap(auth.clone()),
            )
            .route(
                "/api/datasources/{id}",
                web::delete().to(handlers::delete_datasource_handler)
                    .wrap(auth.clone()),
            )
            .route(
                "/api/datasources/{id}/query",
                web::post().to(handlers::query_datasource_handler)
                    .wrap(auth.clone()),
            )
            .route(
                "/api/datasources/{id}/tables",
                web::get().to(handlers::list_tables_handler)
                    .wrap(auth.clone()),
            )
            .route(
                "/api/datasources/{id}/tables/{table}/columns",
                web::get().to(handlers::list_columns_handler)
                    .wrap(auth.clone()),
            )
            .service(
                web::scope("/api/admin")
                    .wrap(auth)
                    .route("/users", web::get().to(handlers::list_users))
                    .route("/users", web::post().to(handlers::create_user))
                    .route("/users/{id}", web::get().to(handlers::get_user))
                    .route("/users/{id}", web::put().to(handlers::update_user))
                    .route("/users/{id}", web::delete().to(handlers::delete_user))
                    .route("/roles", web::get().to(handlers::list_roles))
                    .route("/roles", web::post().to(handlers::create_role))
                    .route("/roles/{id}", web::get().to(handlers::get_role))
                    .route("/roles/{id}", web::put().to(handlers::update_role))
                    .route("/roles/{id}", web::delete().to(handlers::delete_role))
                    .route(
                        "/roles/{id}/permissions",
                        web::put().to(handlers::update_role_permissions),
                    )
                    .route("/permissions", web::get().to(handlers::list_permissions_handler))
                    .route(
                        "/permissions/grouped",
                        web::get().to(handlers::list_permissions_grouped),
                    ),
            )
    })
    .bind((host.as_str(), port))?
    .run()
    .await
}
