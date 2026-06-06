pub use sea_orm_migration::prelude::*;

mod m20250602_000001_create_auth_tables;
mod m20250603_000002_create_dashboards;
mod m20250603_000003_create_snapshots;
mod m20250603_000004_create_datasources;
mod m20250603_000005_add_folder_support;
mod m20250603_000006_cron_schedule;
mod m20250605_000007_snapshot_html_in_db;
mod m20250605_000008_pg_comments;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20250602_000001_create_auth_tables::Migration),
            Box::new(m20250603_000002_create_dashboards::Migration),
            Box::new(m20250603_000003_create_snapshots::Migration),
            Box::new(m20250603_000004_create_datasources::Migration),
            Box::new(m20250603_000005_add_folder_support::Migration),
            Box::new(m20250603_000006_cron_schedule::Migration),
            Box::new(m20250605_000007_snapshot_html_in_db::Migration),
            Box::new(m20250605_000008_pg_comments::Migration),
        ]
    }
}
