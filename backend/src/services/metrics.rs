use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, Statement};

pub async fn query_business_systems(
    db: &DatabaseConnection,
) -> Result<serde_json::Value, sea_orm::DbErr> {
    let row = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            r#"SELECT "references" FROM business_systems LIMIT 1"#.to_owned(),
        ))
        .await?
        .ok_or_else(|| sea_orm::DbErr::RecordNotFound("business_systems not found".into()))?;

    row.try_get("", "references")
}
