use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Rename interval_hours → cron_expr and drop the old column
        manager
            .alter_table(
                Table::alter()
                    .table(DashboardSchedules::Table)
                    .add_column(
                        ColumnDef::new(DashboardSchedules::CronExpr)
                            .string_len(64)
                            .not_null()
                            .default("0 16 * * *"),
                    )
                    .to_owned(),
            )
            .await?;

        // Copy existing interval values to cron expressions
        let stmt = sea_orm::Statement::from_string(
            sea_orm::DbBackend::Postgres,
            "UPDATE dashboard_schedules SET cron_expr = '0 */' || interval_hours || ' * * *' WHERE cron_expr = '0 16 * * *'"
                .to_string(),
        );
        manager.get_connection().execute(stmt).await?;

        // Drop old column
        manager
            .alter_table(
                Table::alter()
                    .table(DashboardSchedules::Table)
                    .drop_column(DashboardSchedules::IntervalHours)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(DashboardSchedules::Table)
                    .add_column(
                        ColumnDef::new(DashboardSchedules::IntervalHours)
                            .integer()
                            .not_null()
                            .default(24),
                    )
                    .drop_column(DashboardSchedules::CronExpr)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum DashboardSchedules {
    Table,
    IntervalHours,
    CronExpr,
}
