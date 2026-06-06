use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "dashboard_snapshots")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub dashboard_id: Uuid,
    #[sea_orm(unique)]
    pub snapshot_key: String,
    pub title: String,
    #[sea_orm(column_type = "JsonBinary")]
    pub variables: Json,
    #[sea_orm(column_type = "JsonBinary")]
    pub panels: Json,
    #[sea_orm(column_type = "Text")]
    pub html_content: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTimeWithTimeZone,
    pub expires_at: Option<DateTimeWithTimeZone>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
