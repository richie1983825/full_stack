use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, Statement, Value};

use crate::models::{MetricFieldMeta, NetworkMetric, NetworkMetricsFrame};
use crate::services::metric_schema::{default_table_field_meta, sort_metrics};

pub async fn query_network_metrics(
    db: &DatabaseConnection,
    date: &str,
) -> Result<Vec<NetworkMetric>, sea_orm::DbErr> {
    let rows = db
        .query_all(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT
                id,
                created_at,
                updated_at,
                -- 展示字段顺序见 metric_schema::DEFAULT_TABLE_FIELD_DEFS
                node AS node_type,
                category AS metric_category,
                metrics AS metric_name,
                unit,
                current_value,
                historical_peak,
                dod_change AS mom_change,
                wow_change AS yoy_change
            FROM net_work_metrics
            WHERE created_at::date = $1::date

            UNION ALL

            SELECT
                id,
                created_at,
                updated_at,
                node AS node_type,
                category AS metric_category,
                metrics AS metric_name,
                unit,
                current_value,
                historical_peak,
                dod_change AS mom_change,
                wow_change AS yoy_change
            FROM net_work_metrics_1
            WHERE created_at::date = $1::date

            ORDER BY node_type, metric_category, metric_name
            "#,
            [date.into()],
        ))
        .await?;

    rows.into_iter()
        .map(|row| {
            Ok(NetworkMetric {
                id: row.try_get("", "id")?,
                created_at: row.try_get("", "created_at")?,
                updated_at: row.try_get("", "updated_at")?,
                node_type: row.try_get("", "node_type")?,
                metric_category: row.try_get("", "metric_category")?,
                metric_name: row.try_get("", "metric_name")?,
                unit: row.try_get("", "unit")?,
                current_value: row.try_get("", "current_value")?,
                historical_peak: row.try_get("", "historical_peak")?,
                mom_change: row.try_get("", "mom_change")?,
                yoy_change: row.try_get("", "yoy_change")?,
            })
        })
        .collect()
}

pub async fn query_network_metrics_frame(
    db: &DatabaseConnection,
    date: &str,
) -> Result<NetworkMetricsFrame, sea_orm::DbErr> {
    let mut rows = query_network_metrics(db, date).await?;
    sort_metrics(&mut rows);
    Ok(NetworkMetricsFrame {
        fields: default_table_field_meta(),
        rows,
    })
}

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
