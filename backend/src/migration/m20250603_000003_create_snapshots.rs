use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[derive(DeriveIden)]
enum DashboardSnapshots {
    Table,
    Id,
    DashboardId,
    SnapshotKey,
    Title,
    Variables,
    Panels,
    HtmlPath,
    CreatedBy,
    CreatedAt,
    ExpiresAt,
}

#[derive(DeriveIden)]
enum DashboardSchedules {
    Table,
    Id,
    DashboardId,
    Enabled,
    IntervalHours,
    DateMode,
    LastRunAt,
    NextRunAt,
    CreatedAt,
    UpdatedAt,
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(DashboardSnapshots::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(DashboardSnapshots::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(DashboardSnapshots::DashboardId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(DashboardSnapshots::SnapshotKey)
                            .string_len(32)
                            .not_null()
                            .unique_key(),
                    )
                    .col(
                        ColumnDef::new(DashboardSnapshots::Title)
                            .string_len(256)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(DashboardSnapshots::Variables)
                            .json_binary()
                            .not_null()
                            .default("{}"),
                    )
                    .col(
                        ColumnDef::new(DashboardSnapshots::Panels)
                            .json_binary()
                            .not_null()
                            .default("[]"),
                    )
                    .col(
                        ColumnDef::new(DashboardSnapshots::HtmlPath)
                            .string_len(512)
                            .not_null(),
                    )
                    .col(ColumnDef::new(DashboardSnapshots::CreatedBy).uuid())
                    .col(
                        ColumnDef::new(DashboardSnapshots::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(DashboardSnapshots::ExpiresAt)
                            .timestamp_with_time_zone(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_snapshots_dashboard")
                            .from(DashboardSnapshots::Table, DashboardSnapshots::DashboardId)
                            .to(Dashboards::Table, Dashboards::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(DashboardSchedules::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(DashboardSchedules::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(DashboardSchedules::DashboardId)
                            .uuid()
                            .not_null()
                            .unique_key(),
                    )
                    .col(
                        ColumnDef::new(DashboardSchedules::Enabled)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(DashboardSchedules::IntervalHours)
                            .integer()
                            .not_null()
                            .default(24),
                    )
                    .col(
                        ColumnDef::new(DashboardSchedules::DateMode)
                            .string_len(32)
                            .not_null()
                            .default("dashboard"),
                    )
                    .col(
                        ColumnDef::new(DashboardSchedules::LastRunAt)
                            .timestamp_with_time_zone(),
                    )
                    .col(
                        ColumnDef::new(DashboardSchedules::NextRunAt)
                            .timestamp_with_time_zone(),
                    )
                    .col(
                        ColumnDef::new(DashboardSchedules::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(DashboardSchedules::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_schedules_dashboard")
                            .from(DashboardSchedules::Table, DashboardSchedules::DashboardId)
                            .to(Dashboards::Table, Dashboards::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(DashboardSchedules::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(DashboardSnapshots::Table).to_owned())
            .await?;
        Ok(())
    }
}

#[derive(DeriveIden)]
enum Dashboards {
    Table,
    Id,
}
