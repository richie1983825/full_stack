//! 应用日志初始化（log + env_logger）

/// 未设置 RUST_LOG 时的默认过滤：业务 info，SQL/ORM warn 以下静默
pub const DEFAULT_RUST_LOG: &str = "info,cmp_backend=info,actix_web=info,sqlx=warn,sea_orm=warn";

pub fn init() {
    env_logger::Builder::from_env(
        env_logger::Env::default().default_filter_or(DEFAULT_RUST_LOG),
    )
    .format_timestamp_secs()
    .format_module_path(false)
    .init();
}

pub fn parse_bool_env(key: &str, default: bool) -> bool {
    std::env::var(key)
        .map(|v| {
            let v = v.to_lowercase();
            matches!(v.as_str(), "1" | "true" | "yes")
        })
        .unwrap_or(default)
}
