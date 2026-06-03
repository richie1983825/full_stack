use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub server_host: String,
    pub server_port: u16,
    pub jwt_secret: String,
    pub jwt_expires_hours: i64,
    pub snapshot_dir: String,
    pub public_base_url: String,
}

impl Config {
    pub fn from_env() -> Self {
        let server_host = env::var("SERVER_HOST").unwrap_or_else(|_| "127.0.0.1".into());
        let server_port = env::var("SERVER_PORT")
            .unwrap_or_else(|_| "3101".into())
            .parse()
            .expect("SERVER_PORT must be a valid u16");

        let public_base_url = env::var("PUBLIC_BASE_URL").unwrap_or_else(|_| {
            format!("http://{server_host}:{server_port}")
        });

        Self {
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://postgres:@localhost:5432/cmp_service".into()),
            server_host,
            server_port,
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "cmp-dev-secret-change-in-production".into()),
            jwt_expires_hours: env::var("JWT_EXPIRES_HOURS")
                .unwrap_or_else(|_| "24".into())
                .parse()
                .expect("JWT_EXPIRES_HOURS must be a valid i64"),
            snapshot_dir: env::var("SNAPSHOT_DIR")
                .unwrap_or_else(|_| "./data/snapshots".into()),
            public_base_url,
        }
    }
}
