pub use sea_orm_migration::prelude::*;

mod m20250602_000001_create_auth_tables;
mod m20250603_000002_create_dashboards;
mod m20250603_000003_create_snapshots;
mod m20250603_000004_create_datasources;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20250602_000001_create_auth_tables::Migration),
            Box::new(m20250603_000002_create_dashboards::Migration),
            Box::new(m20250603_000003_create_snapshots::Migration),
            Box::new(m20250603_000004_create_datasources::Migration),
        ]
    }
}
