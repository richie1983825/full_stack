use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Datasources::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Datasources::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Datasources::Name)
                            .string_len(128)
                            .not_null(),
                    )
                    .col(ColumnDef::new(Datasources::Description).text())
                    .col(
                        ColumnDef::new(Datasources::DbType)
                            .string_len(32)
                            .not_null()
                            .default("postgres"),
                    )
                    .col(
                        ColumnDef::new(Datasources::Host)
                            .string_len(255)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Datasources::Port)
                            .integer()
                            .not_null()
                            .default(5432),
                    )
                    .col(
                        ColumnDef::new(Datasources::Database)
                            .string_len(128)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Datasources::Username)
                            .string_len(128)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Datasources::Password)
                            .string_len(512)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Datasources::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Datasources::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Datasources::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum Datasources {
    Table,
    Id,
    Name,
    Description,
    #[sea_orm(iden = "db_type")]
    DbType,
    Host,
    Port,
    Database,
    Username,
    Password,
    CreatedAt,
    UpdatedAt,
}
