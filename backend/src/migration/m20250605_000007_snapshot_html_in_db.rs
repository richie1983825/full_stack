use sea_orm::{DbBackend, FromQueryResult, Statement};
use sea_orm_migration::prelude::*;
use uuid::Uuid;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[derive(DeriveIden)]
enum DashboardSnapshots {
    Table,
    HtmlPath,
    HtmlContent,
}

#[derive(FromQueryResult)]
struct LegacySnapshotRow {
    id: Uuid,
    html_path: String,
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(DashboardSnapshots::Table)
                    .add_column(
                        ColumnDef::new(DashboardSnapshots::HtmlContent)
                            .text()
                            .not_null()
                            .default(""),
                    )
                    .to_owned(),
            )
            .await?;

        let db = manager.get_connection();
        let rows = LegacySnapshotRow::find_by_statement(Statement::from_string(
            DbBackend::Postgres,
            "SELECT id, html_path FROM dashboard_snapshots WHERE html_path <> ''",
        ))
        .all(db)
        .await?;

        for row in rows {
            if let Ok(content) = std::fs::read_to_string(&row.html_path) {
                db.execute(Statement::from_sql_and_values(
                    DbBackend::Postgres,
                    "UPDATE dashboard_snapshots SET html_content = $1 WHERE id = $2",
                    [content.into(), row.id.into()],
                ))
                .await?;
                let _ = std::fs::remove_file(&row.html_path);
            }
        }

        manager
            .alter_table(
                Table::alter()
                    .table(DashboardSnapshots::Table)
                    .drop_column(DashboardSnapshots::HtmlPath)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(DashboardSnapshots::Table)
                    .add_column(
                        ColumnDef::new(DashboardSnapshots::HtmlPath)
                            .string_len(512)
                            .not_null()
                            .default(""),
                    )
                    .drop_column(DashboardSnapshots::HtmlContent)
                    .to_owned(),
            )
            .await
    }
}
