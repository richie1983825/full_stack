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
                    .table(Users::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Users::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Users::Username)
                            .string_len(64)
                            .not_null()
                            .unique_key(),
                    )
                    .col(
                        ColumnDef::new(Users::Email)
                            .string_len(128)
                            .not_null()
                            .unique_key(),
                    )
                    .col(
                        ColumnDef::new(Users::PasswordHash)
                            .string_len(255)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Users::DisplayName)
                            .string_len(128)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Users::IsActive)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(Users::IsGrafanaAdmin)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(Users::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Users::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Roles::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Roles::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Roles::Name)
                            .string_len(64)
                            .not_null()
                            .unique_key(),
                    )
                    .col(
                        ColumnDef::new(Roles::Description)
                            .string_len(255)
                            .not_null()
                            .default(""),
                    )
                    .col(
                        ColumnDef::new(Roles::IsSystem)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(Roles::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Roles::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Permissions::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Permissions::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Permissions::Code)
                            .string_len(64)
                            .not_null()
                            .unique_key(),
                    )
                    .col(
                        ColumnDef::new(Permissions::Resource)
                            .string_len(64)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Permissions::Action)
                            .string_len(32)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Permissions::Description)
                            .string_len(255)
                            .not_null()
                            .default(""),
                    )
                    .col(
                        ColumnDef::new(Permissions::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(RolePermissions::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(RolePermissions::RoleId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(RolePermissions::PermissionId)
                            .uuid()
                            .not_null(),
                    )
                    .primary_key(
                        Index::create()
                            .col(RolePermissions::RoleId)
                            .col(RolePermissions::PermissionId),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(RolePermissions::Table, RolePermissions::RoleId)
                            .to(Roles::Table, Roles::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(RolePermissions::Table, RolePermissions::PermissionId)
                            .to(Permissions::Table, Permissions::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(UserRoles::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(UserRoles::UserId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(UserRoles::RoleId)
                            .uuid()
                            .not_null(),
                    )
                    .primary_key(
                        Index::create()
                            .col(UserRoles::UserId)
                            .col(UserRoles::RoleId),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(UserRoles::Table, UserRoles::UserId)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(UserRoles::Table, UserRoles::RoleId)
                            .to(Roles::Table, Roles::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        seed_auth_data(manager).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(UserRoles::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(RolePermissions::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Permissions::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Roles::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Users::Table).to_owned())
            .await
    }
}

async fn seed_auth_data(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    let db = manager.get_connection();

    let perm_rows = [
        (
            "00000000-0000-0000-0000-000000000001",
            "dashboards:read",
            "dashboards",
            "read",
            "查看仪表盘",
        ),
        (
            "00000000-0000-0000-0000-000000000002",
            "dashboards:write",
            "dashboards",
            "write",
            "编辑仪表盘",
        ),
        (
            "00000000-0000-0000-0000-000000000003",
            "dashboards:admin",
            "dashboards",
            "admin",
            "管理仪表盘",
        ),
        (
            "00000000-0000-0000-0000-000000000004",
            "users:read",
            "users",
            "read",
            "查看用户",
        ),
        (
            "00000000-0000-0000-0000-000000000005",
            "users:write",
            "users",
            "write",
            "编辑用户",
        ),
        (
            "00000000-0000-0000-0000-000000000006",
            "users:admin",
            "users",
            "admin",
            "管理用户",
        ),
        (
            "00000000-0000-0000-0000-000000000007",
            "roles:read",
            "roles",
            "read",
            "查看角色",
        ),
        (
            "00000000-0000-0000-0000-000000000008",
            "roles:write",
            "roles",
            "write",
            "编辑角色",
        ),
        (
            "00000000-0000-0000-0000-000000000009",
            "settings:read",
            "settings",
            "read",
            "查看设置",
        ),
        (
            "00000000-0000-0000-0000-00000000000a",
            "settings:write",
            "settings",
            "write",
            "编辑设置",
        ),
    ];

    for (id, code, resource, action, description) in perm_rows {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO permissions (id, code, resource, action, description)
            VALUES ($1::uuid, $2, $3, $4, $5)
            ON CONFLICT (code) DO NOTHING
            "#,
            [
                id.into(),
                code.into(),
                resource.into(),
                action.into(),
                description.into(),
            ],
        );
        db.execute(stmt).await?;
    }

    let role_rows = [
        (
            "00000000-0000-0000-0000-000000000101",
            "Grafana Admin",
            "全局超级管理员，拥有所有权限",
            true,
        ),
        (
            "00000000-0000-0000-0000-000000000102",
            "Admin",
            "组织管理员，可管理用户与设置",
            true,
        ),
        (
            "00000000-0000-0000-0000-000000000103",
            "Editor",
            "可查看和编辑仪表盘",
            true,
        ),
        (
            "00000000-0000-0000-0000-000000000104",
            "Viewer",
            "只读访问仪表盘",
            true,
        ),
    ];

    for (id, name, description, is_system) in role_rows {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO roles (id, name, description, is_system)
            VALUES ($1::uuid, $2, $3, $4)
            ON CONFLICT (name) DO NOTHING
            "#,
            [id.into(), name.into(), description.into(), is_system.into()],
        );
        db.execute(stmt).await?;
    }

    let all_perm_ids = perm_rows
        .iter()
        .map(|(id, ..)| *id)
        .collect::<Vec<_>>();

    let role_perm_map: [(&str, &[&str]); 4] = [
        ("00000000-0000-0000-0000-000000000101", &all_perm_ids),
        (
            "00000000-0000-0000-0000-000000000102",
            &[
                "00000000-0000-0000-0000-000000000001",
                "00000000-0000-0000-0000-000000000002",
                "00000000-0000-0000-0000-000000000003",
                "00000000-0000-0000-0000-000000000004",
                "00000000-0000-0000-0000-000000000005",
                "00000000-0000-0000-0000-000000000006",
                "00000000-0000-0000-0000-000000000007",
                "00000000-0000-0000-0000-000000000008",
                "00000000-0000-0000-0000-000000000009",
                "00000000-0000-0000-0000-00000000000a",
            ],
        ),
        (
            "00000000-0000-0000-0000-000000000103",
            &[
                "00000000-0000-0000-0000-000000000001",
                "00000000-0000-0000-0000-000000000002",
            ],
        ),
        (
            "00000000-0000-0000-0000-000000000104",
            &["00000000-0000-0000-0000-000000000001"],
        ),
    ];

    for (role_id, perm_ids) in role_perm_map {
        for perm_id in perm_ids {
            let stmt = Statement::from_sql_and_values(
                DbBackend::Postgres,
                r#"
                INSERT INTO role_permissions (role_id, permission_id)
                VALUES ($1::uuid, $2::uuid)
                ON CONFLICT DO NOTHING
                "#,
                [role_id.into(), (*perm_id).into()],
            );
            db.execute(stmt).await?;
        }
    }

    let password_hash = bcrypt::hash("admin123", bcrypt::DEFAULT_COST)
        .map_err(|e| DbErr::Custom(format!("bcrypt error: {e}")))?;

    let admin_id = "00000000-0000-0000-0000-000000000201";
    let stmt = Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        INSERT INTO users (id, username, email, password_hash, display_name, is_active, is_grafana_admin)
        VALUES ($1::uuid, $2, $3, $4, $5, true, true)
        ON CONFLICT (username) DO NOTHING
        "#,
        [
            admin_id.into(),
            "admin".into(),
            "admin@cmp.local".into(),
            password_hash.into(),
            "Administrator".into(),
        ],
    );
    db.execute(stmt).await?;

    let stmt = Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1::uuid, $2::uuid)
        ON CONFLICT DO NOTHING
        "#,
        [
            admin_id.into(),
            "00000000-0000-0000-0000-000000000101".into(),
        ],
    );
    db.execute(stmt).await?;

    Ok(())
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Id,
    Username,
    Email,
    PasswordHash,
    DisplayName,
    IsActive,
    IsGrafanaAdmin,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Roles {
    Table,
    Id,
    Name,
    Description,
    IsSystem,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Permissions {
    Table,
    Id,
    Code,
    Resource,
    Action,
    Description,
    CreatedAt,
}

#[derive(DeriveIden)]
enum RolePermissions {
    Table,
    RoleId,
    PermissionId,
}

#[derive(DeriveIden)]
enum UserRoles {
    Table,
    UserId,
    RoleId,
}
