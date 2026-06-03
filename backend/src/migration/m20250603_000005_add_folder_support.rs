use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Dashboards::Table)
                    .add_column(
                        ColumnDef::new(Dashboards::ParentId)
                            .uuid()
                            .null(),
                    )
                    .add_column(
                        ColumnDef::new(Dashboards::Kind)
                            .string_len(16)
                            .not_null()
                            .default("dashboard"),
                    )
                    .to_owned(),
            )
            .await?;

        // Update existing rows
        let stmt = sea_orm::Statement::from_string(
            sea_orm::DbBackend::Postgres,
            "UPDATE dashboards SET kind = 'dashboard' WHERE kind IS NULL OR kind = ''".to_string(),
        );
        manager.get_connection().execute(stmt).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Dashboards::Table)
                    .drop_column(Dashboards::ParentId)
                    .drop_column(Dashboards::Kind)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum Dashboards {
    Table,
    ParentId,
    Kind,
}
