use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use sea_orm::{ActiveModelTrait, EntityTrait, ModelTrait, QueryFilter, Set};
use uuid::Uuid;

use crate::config::Config;
use crate::entity::datasources;
use crate::models::{
    CreateDatasourceRequest, DatasourceQueryResult, DatasourceResponse,
    MetricFieldMeta, UpdateDatasourceRequest,
};

/// Derive a 32-byte key from the JWT secret (AES-256 needs exactly 32 bytes).
fn encryption_key(cfg: &Config) -> Vec<u8> {
    let secret = cfg.jwt_secret.as_bytes();
    if secret.len() >= 32 {
        secret[..32].to_vec()
    } else {
        let mut key = vec![0u8; 32];
        key[..secret.len()].copy_from_slice(secret);
        key
    }
}

fn encrypt_password(password: &str, cfg: &Config) -> Result<String, String> {
    let key = encryption_key(cfg);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| format!("cipher init: {e}"))?;
    let nonce_bytes = rand::random::<[u8; 12]>();
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, password.as_bytes())
        .map_err(|e| format!("encrypt: {e}"))?;
    let mut combined = nonce_bytes.to_vec();
    combined.extend_from_slice(&ciphertext);
    Ok(BASE64.encode(&combined))
}

fn decrypt_password(encoded: &str, cfg: &Config) -> Result<String, String> {
    let combined = BASE64
        .decode(encoded)
        .map_err(|e| format!("base64 decode: {e}"))?;
    if combined.len() < 12 {
        return Err("invalid ciphertext".into());
    }
    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let key = encryption_key(cfg);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| format!("cipher init: {e}"))?;
    let nonce = Nonce::from_slice(nonce_bytes);
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("decrypt: {e}"))?;
    String::from_utf8(plaintext).map_err(|e| format!("utf8: {e}"))
}

fn to_response(model: &datasources::Model) -> DatasourceResponse {
    DatasourceResponse {
        id: model.id,
        name: model.name.clone(),
        description: model.description.clone(),
        db_type: model.db_type.clone(),
        host: model.host.clone(),
        port: model.port,
        database: model.database.clone(),
        username: model.username.clone(),
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

pub async fn list_datasources(
    db: &sea_orm::DatabaseConnection,
) -> Result<Vec<DatasourceResponse>, String> {
    let models = datasources::Entity::find()
        .all(db)
        .await
        .map_err(|e| format!("db: {e}"))?;
    Ok(models.iter().map(to_response).collect())
}

pub async fn get_datasource(
    db: &sea_orm::DatabaseConnection,
    id: Uuid,
) -> Result<DatasourceResponse, String> {
    let model = datasources::Entity::find_by_id(id)
        .one(db)
        .await
        .map_err(|e| format!("db: {e}"))?
        .ok_or_else(|| "not found".to_string())?;
    Ok(to_response(&model))
}

pub async fn create_datasource(
    db: &sea_orm::DatabaseConnection,
    cfg: &Config,
    req: CreateDatasourceRequest,
) -> Result<DatasourceResponse, String> {
    let encrypted = encrypt_password(&req.password, cfg)?;

    let model = datasources::ActiveModel {
        id: Set(Uuid::new_v4()),
        name: Set(req.name),
        description: Set(req.description),
        db_type: Set(req.db_type.unwrap_or_else(|| "postgres".into())),
        host: Set(req.host),
        port: Set(req.port.unwrap_or(5432)),
        database: Set(req.database),
        username: Set(req.username),
        password: Set(encrypted),
        created_at: Set(chrono::Utc::now().into()),
        updated_at: Set(chrono::Utc::now().into()),
    };

    let saved = model
        .insert(db)
        .await
        .map_err(|e| format!("insert: {e}"))?;
    Ok(to_response(&saved))
}

pub async fn update_datasource(
    db: &sea_orm::DatabaseConnection,
    cfg: &Config,
    id: Uuid,
    req: UpdateDatasourceRequest,
) -> Result<DatasourceResponse, String> {
    let existing = datasources::Entity::find_by_id(id)
        .one(db)
        .await
        .map_err(|e| format!("db: {e}"))?
        .ok_or_else(|| "not found".to_string())?;

    let mut active: datasources::ActiveModel = existing.into();
    if let Some(name) = req.name {
        active.name = Set(name);
    }
    if req.description.is_some() {
        active.description = Set(req.description);
    }
    if let Some(db_type) = req.db_type {
        active.db_type = Set(db_type);
    }
    if let Some(host) = req.host {
        active.host = Set(host);
    }
    if let Some(port) = req.port {
        active.port = Set(port);
    }
    if let Some(database) = req.database {
        active.database = Set(database);
    }
    if let Some(username) = req.username {
        active.username = Set(username);
    }
    if let Some(password) = req.password {
        active.password = Set(encrypt_password(&password, cfg)?);
    }
    active.updated_at = Set(chrono::Utc::now().into());

    let saved = active
        .update(db)
        .await
        .map_err(|e| format!("update: {e}"))?;
    Ok(to_response(&saved))
}

pub async fn delete_datasource(
    db: &sea_orm::DatabaseConnection,
    id: Uuid,
) -> Result<(), String> {
    let model = datasources::Entity::find_by_id(id)
        .one(db)
        .await
        .map_err(|e| format!("db: {e}"))?
        .ok_or_else(|| "not found".to_string())?;
    model
        .delete(db)
        .await
        .map_err(|e| format!("delete: {e}"))?;
    Ok(())
}

pub async fn query_datasource_sql(
    db: &sea_orm::DatabaseConnection,
    cfg: &Config,
    id: Uuid,
    sql: &str,
) -> Result<DatasourceQueryResult, String> {
    use sqlx::{Column, Row};
    use std::time::Duration;

    // Fetch datasource to get connection info
    let model = datasources::Entity::find_by_id(id)
        .one(db)
        .await
        .map_err(|e| format!("db: {e}"))?
        .ok_or_else(|| "datasource not found".to_string())?;

    let password = decrypt_password(&model.password, cfg)?;

    let conn_str = format!(
        "postgres://{}:{}@{}:{}/{}",
        model.username, password, model.host, model.port, model.database
    );

    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(Duration::from_secs(10))
        .connect(&conn_str)
        .await
        .map_err(|e| format!("connection failed: {e}"))?;

    let rows = sqlx::query(sql)
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("query failed: {e}"))?;

    if rows.is_empty() {
        return Ok(DatasourceQueryResult {
            fields: vec![],
            rows: vec![],
        });
    }

    // Build field metadata from columns
    let fields: Vec<MetricFieldMeta> = rows[0]
        .columns()
        .iter()
        .map(|col| MetricFieldMeta {
            name: col.name().to_string(),
            label: col.name().to_string(),
            field_type: "string".into(),
            merge_same: None,
            format: None,
        })
        .collect();

    // Convert all rows to string-based JSON values
    let row_values: Vec<serde_json::Value> = rows
        .iter()
        .map(|row| {
            let mut map = serde_json::Map::new();
            for col in row.columns() {
                let name = col.name();
                let value: serde_json::Value = row
                    .try_get::<String, _>(name)
                    .map(|v| {
                        if let Ok(n) = v.parse::<i64>() {
                            serde_json::json!(n)
                        } else if let Ok(n) = v.parse::<f64>() {
                            serde_json::json!(n)
                        } else {
                            serde_json::json!(v)
                        }
                    })
                    .or_else(|_| {
                        row.try_get::<i64, _>(name)
                            .map(|v| serde_json::json!(v))
                    })
                    .or_else(|_| {
                        row.try_get::<i32, _>(name)
                            .map(|v| serde_json::json!(v))
                    })
                    .or_else(|_| {
                        row.try_get::<f64, _>(name)
                            .map(|v| serde_json::json!(v))
                    })
                    .or_else(|_| {
                        row.try_get::<f32, _>(name)
                            .map(|v| serde_json::json!(v))
                    })
                    .or_else(|_| {
                        row.try_get::<bool, _>(name)
                            .map(|v| serde_json::json!(v))
                    })
                    .or_else(|_| {
                        row.try_get::<uuid::Uuid, _>(name)
                            .map(|v| serde_json::json!(v.to_string()))
                    })
                    .or_else(|_| {
                        row.try_get::<chrono::NaiveDate, _>(name)
                            .map(|v| serde_json::json!(v.to_string()))
                    })
                    .or_else(|_| {
                        row.try_get::<chrono::NaiveDateTime, _>(name)
                            .map(|v| serde_json::json!(v.to_string()))
                    })
                    .or_else(|_| {
                        row.try_get::<chrono::DateTime<chrono::Utc>, _>(name)
                            .map(|v| serde_json::json!(v.to_string()))
                    })
                    .unwrap_or(serde_json::Value::Null);
                map.insert(name.to_string(), value);
            }
            serde_json::Value::Object(map)
        })
        .collect();

    Ok(DatasourceQueryResult {
        fields,
        rows: row_values,
    })
}

/// 启动时播种默认数据源（CMP 自身使用的 PostgreSQL）
pub async fn seed_default_datasource(
    db: &sea_orm::DatabaseConnection,
    cfg: &Config,
) -> Result<(), String> {
    use sea_orm::ColumnTrait;

    // 检查是否已存在名为 "CMP 数据库" 的数据源
    let existing = datasources::Entity::find()
        .filter(datasources::Column::Name.eq("CMP 数据库"))
        .one(db)
        .await
        .map_err(|e| format!("db: {e}"))?;

    if existing.is_some() {
        return Ok(());
    }

    // 解析 DATABASE_URL 获取连接信息: postgres://user:pass@host:port/db
    let (host, port, database, username, password) = parse_db_url(&cfg.database_url)
        .unwrap_or_else(|_| ("localhost".into(), 5432, "cmp_service".into(), "postgres".into(), "".into()));

    let encrypted = encrypt_password(&password, cfg)?;

    // 使用固定 UUID，与仪表盘 seed 中 DEFAULT_DATASOURCE_ID 一致
    let default_id = Uuid::parse_str("00000000-0000-0000-0000-000000000401")
        .unwrap_or_else(|_| Uuid::new_v4());

    let model = datasources::ActiveModel {
        id: Set(default_id),
        name: Set("CMP 数据库".into()),
        description: Set(Some("CMP 容量管理平台自身数据库".into())),
        db_type: Set("postgres".into()),
        host: Set(host),
        port: Set(port),
        database: Set(database),
        username: Set(username),
        password: Set(encrypted),
        created_at: Set(chrono::Utc::now().into()),
        updated_at: Set(chrono::Utc::now().into()),
    };

    model
        .insert(db)
        .await
        .map_err(|e| format!("seed insert: {e}"))?;

    log::info!("✅ Seeded default datasource: CMP 数据库");
    Ok(())
}

fn parse_db_url(url: &str) -> Result<(String, i32, String, String, String), String> {
    // postgres://user:pass@host:port/db
    // postgres://user@host:port/db (no password)
    let without_prefix = url.strip_prefix("postgres://").unwrap_or(url);
    let (userinfo, rest) = without_prefix
        .split_once('@')
        .ok_or("invalid db url: no @")?;

    let (username, password) = if let Some((u, p)) = userinfo.split_once(':') {
        (u, url_decode(p)?)
    } else {
        (userinfo, String::new())
    };

    let (host_port, database) = rest
        .split_once('/')
        .ok_or("invalid db url: no / after host")?;

    let (host, port) = if let Some((h, p)) = host_port.split_once(':') {
        (h.to_string(), p.parse::<i32>().map_err(|e| format!("bad port: {e}"))?)
    } else {
        (host_port.to_string(), 5432)
    };

    Ok((host, port, database.to_string(), username.to_string(), password))
}

fn url_decode(s: &str) -> Result<String, String> {
    let mut out = String::with_capacity(s.len());
    let mut chars = s.bytes();
    while let Some(b) = chars.next() {
        if b == b'%' {
            let hi = chars.next().ok_or("truncated % escape")?;
            let lo = chars.next().ok_or("truncated % escape")?;
            let byte = u8::from_str_radix(
                &format!("{}{}", hi as char, lo as char),
                16,
            )
            .map_err(|e| format!("bad % escape: {e}"))?;
            out.push(byte as char);
        } else if b == b'+' {
            out.push(' ');
        } else {
            out.push(b as char);
        }
    }
    Ok(out)
}

// ====== Schema discovery ======

/// 列出数据源中 public schema 的所有表
pub async fn list_tables(
    db: &sea_orm::DatabaseConnection,
    cfg: &Config,
    id: Uuid,
) -> Result<Vec<String>, String> {
    use sqlx::Row;
    use std::time::Duration;

    let model = datasources::Entity::find_by_id(id)
        .one(db)
        .await
        .map_err(|e| format!("db: {e}"))?
        .ok_or_else(|| "datasource not found".to_string())?;

    let password = decrypt_password(&model.password, cfg)?;
    let conn_str = format!(
        "postgres://{}:{}@{}:{}/{}",
        model.username, password, model.host, model.port, model.database
    );

    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&conn_str)
        .await
        .map_err(|e| format!("connection failed: {e}"))?;

    let rows = sqlx::query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("query failed: {e}"))?;

    let tables: Vec<String> = rows.iter().map(|r| r.get::<String, _>(0)).collect();
    Ok(tables)
}

/// 列出指定表的列名和类型
pub async fn list_columns(
    db: &sea_orm::DatabaseConnection,
    cfg: &Config,
    id: Uuid,
    table: &str,
) -> Result<Vec<ColumnInfo>, String> {
    use sqlx::Row;
    use std::time::Duration;

    let model = datasources::Entity::find_by_id(id)
        .one(db)
        .await
        .map_err(|e| format!("db: {e}"))?
        .ok_or_else(|| "datasource not found".to_string())?;

    let password = decrypt_password(&model.password, cfg)?;
    let conn_str = format!(
        "postgres://{}:{}@{}:{}/{}",
        model.username, password, model.host, model.port, model.database
    );

    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&conn_str)
        .await
        .map_err(|e| format!("connection failed: {e}"))?;

    let rows = sqlx::query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position",
    )
    .bind(table)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("query failed: {e}"))?;

    let columns: Vec<ColumnInfo> = rows
        .iter()
        .map(|r| ColumnInfo {
            name: r.get::<String, _>(0),
            data_type: r.get::<String, _>(1),
        })
        .collect();

    Ok(columns)
}

#[derive(Debug, serde::Serialize)]
pub struct ColumnInfo {
    pub name: String,
    #[serde(rename = "dataType")]
    pub data_type: String,
}

impl From<datasources::Model> for DatasourceResponse {
    fn from(m: datasources::Model) -> Self {
        to_response(&m)
    }
}
