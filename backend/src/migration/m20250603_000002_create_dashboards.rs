use sea_orm_migration::prelude::*;
use sea_orm::{DbBackend, Statement};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Dashboards::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Dashboards::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Dashboards::Title)
                            .string_len(128)
                            .not_null(),
                    )
                    .col(ColumnDef::new(Dashboards::Description).text())
                    .col(
                        ColumnDef::new(Dashboards::Panels)
                            .json_binary()
                            .not_null()
                            .default("[]"),
                    )
                    .col(
                        ColumnDef::new(Dashboards::Variables)
                            .json_binary()
                            .not_null()
                            .default("{}"),
                    )
                    .col(
                        ColumnDef::new(Dashboards::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Dashboards::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        seed_default_dashboard(manager).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Dashboards::Table).to_owned())
            .await
    }
}

// 默认数据源 UUID（与 datasources seed 中保持一致）
const DEFAULT_DATASOURCE_ID: &str = "00000000-0000-0000-0000-000000000401";

async fn seed_default_dashboard(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    let panels = serde_json::json!([
        {
            "id": "panel-line-1",
            "title": "仪表盘创建趋势",
            "chartType": "line",
            "grid": { "x": 0, "y": 0, "w": 6, "h": 3 },
            "query": {
                "datasourceId": DEFAULT_DATASOURCE_ID,
                "sql": "SELECT created_at::date AS day, COUNT(*) AS cnt FROM dashboards GROUP BY created_at::date ORDER BY created_at::date LIMIT 30",
                "sqlMode": "code"
            },
            "option": {
                "tooltip": { "trigger": "axis" },
                "legend": { "bottom": 0 },
                "xAxis": { "type": "category", "data": [] },
                "yAxis": { "type": "value", "name": "数量" },
                "series": []
            }
        },
        {
            "id": "panel-bar-1",
            "title": "用户统计",
            "chartType": "bar",
            "grid": { "x": 6, "y": 0, "w": 6, "h": 3 },
            "query": {
                "datasourceId": DEFAULT_DATASOURCE_ID,
                "sql": "SELECT username, 1 AS score FROM users ORDER BY username LIMIT 5",
                "sqlMode": "code"
            },
            "option": {
                "tooltip": { "trigger": "axis" },
                "grid": { "left": 120, "right": 20, "top": 20, "bottom": 30 },
                "xAxis": { "type": "value" },
                "yAxis": { "type": "category", "data": [] },
                "series": []
            }
        },
        {
            "id": "panel-table-1",
            "title": "用户列表",
            "chartType": "table",
            "grid": { "x": 0, "y": 3, "w": 12, "h": 4 },
            "query": {
                "datasourceId": DEFAULT_DATASOURCE_ID,
                "sql": "SELECT username, email, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 10",
                "sqlMode": "code"
            },
            "option": { "data": [] }
        }
    ]);

    let stmt = Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        INSERT INTO dashboards (id, title, description, panels, variables, kind)
        VALUES ($1::uuid, $2, $3, $4::jsonb, $5::jsonb, $6)
        ON CONFLICT (id) DO NOTHING
        "#,
        [
            "00000000-0000-0000-0000-000000000301".into(),
            "数据概览".into(),
            "默认仪表盘 — 通过 SQL 数据源查询展示".into(),
            panels.into(),
            serde_json::json!({}).into(),
            "dashboard".into(),
        ],
    );
    manager.get_connection().execute(stmt).await?;
    Ok(())
}

#[derive(DeriveIden)]
enum Dashboards {
    Table,
    Id,
    Title,
    Description,
    Panels,
    Variables,
    CreatedAt,
    UpdatedAt,
}
