use sea_orm::{DbBackend, Statement};
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        macro_rules! comment {
            ($sql:expr) => {{
                db.execute(Statement::from_string(DbBackend::Postgres, $sql.to_string()))
                    .await?;
            }};
        }

        comment!("COMMENT ON TABLE users IS '系统用户表'");
        comment!("COMMENT ON COLUMN users.id IS '用户唯一标识（UUID）'");
        comment!("COMMENT ON COLUMN users.username IS '登录用户名'");
        comment!("COMMENT ON COLUMN users.email IS '电子邮箱'");
        comment!("COMMENT ON COLUMN users.password_hash IS '密码哈希（bcrypt）'");
        comment!("COMMENT ON COLUMN users.display_name IS '显示名称'");
        comment!("COMMENT ON COLUMN users.is_active IS '是否启用'");
        comment!("COMMENT ON COLUMN users.is_grafana_admin IS '是否为 Grafana 超级管理员'");
        comment!("COMMENT ON COLUMN users.created_at IS '创建时间'");
        comment!("COMMENT ON COLUMN users.updated_at IS '更新时间'");

        comment!("COMMENT ON TABLE roles IS '角色表'");
        comment!("COMMENT ON COLUMN roles.id IS '角色唯一标识（UUID）'");
        comment!("COMMENT ON COLUMN roles.name IS '角色名称'");
        comment!("COMMENT ON COLUMN roles.description IS '角色描述'");
        comment!("COMMENT ON COLUMN roles.is_system IS '是否为系统内置角色'");
        comment!("COMMENT ON COLUMN roles.created_at IS '创建时间'");
        comment!("COMMENT ON COLUMN roles.updated_at IS '更新时间'");

        comment!("COMMENT ON TABLE permissions IS '权限定义表'");
        comment!("COMMENT ON COLUMN permissions.id IS '权限唯一标识（UUID）'");
        comment!("COMMENT ON COLUMN permissions.code IS '权限编码（如 dashboards:read）'");
        comment!("COMMENT ON COLUMN permissions.resource IS '资源类型（如 dashboards、users）'");
        comment!("COMMENT ON COLUMN permissions.action IS '操作类型（如 read、write、admin）'");
        comment!("COMMENT ON COLUMN permissions.description IS '权限中文说明'");
        comment!("COMMENT ON COLUMN permissions.created_at IS '创建时间'");

        comment!("COMMENT ON TABLE role_permissions IS '角色与权限关联表'");
        comment!("COMMENT ON COLUMN role_permissions.role_id IS '角色 ID'");
        comment!("COMMENT ON COLUMN role_permissions.permission_id IS '权限 ID'");

        comment!("COMMENT ON TABLE user_roles IS '用户与角色关联表'");
        comment!("COMMENT ON COLUMN user_roles.user_id IS '用户 ID'");
        comment!("COMMENT ON COLUMN user_roles.role_id IS '角色 ID'");

        comment!("COMMENT ON TABLE dashboards IS '仪表盘与文件夹表'");
        comment!("COMMENT ON COLUMN dashboards.id IS '仪表盘唯一标识（UUID）'");
        comment!("COMMENT ON COLUMN dashboards.title IS '标题'");
        comment!("COMMENT ON COLUMN dashboards.description IS '描述'");
        comment!("COMMENT ON COLUMN dashboards.panels IS '面板配置（JSON）'");
        comment!("COMMENT ON COLUMN dashboards.variables IS '变量配置（JSON，如 date）'");
        comment!("COMMENT ON COLUMN dashboards.created_at IS '创建时间'");
        comment!("COMMENT ON COLUMN dashboards.updated_at IS '更新时间'");
        comment!("COMMENT ON COLUMN dashboards.parent_id IS '父文件夹 ID（为空表示根级）'");
        comment!("COMMENT ON COLUMN dashboards.kind IS '类型：dashboard 或 folder'");

        comment!("COMMENT ON TABLE dashboard_snapshots IS '仪表盘静态快照表'");
        comment!("COMMENT ON COLUMN dashboard_snapshots.id IS '快照唯一标识（UUID）'");
        comment!("COMMENT ON COLUMN dashboard_snapshots.dashboard_id IS '所属仪表盘 ID'");
        comment!("COMMENT ON COLUMN dashboard_snapshots.snapshot_key IS '快照访问密钥（URL 路径）'");
        comment!("COMMENT ON COLUMN dashboard_snapshots.title IS '快照标题'");
        comment!("COMMENT ON COLUMN dashboard_snapshots.variables IS '快照变量快照（JSON）'");
        comment!("COMMENT ON COLUMN dashboard_snapshots.panels IS '水合后的面板数据（JSON）'");
        comment!("COMMENT ON COLUMN dashboard_snapshots.created_by IS '创建者用户 ID'");
        comment!("COMMENT ON COLUMN dashboard_snapshots.created_at IS '创建时间'");
        comment!("COMMENT ON COLUMN dashboard_snapshots.expires_at IS '过期时间（为空表示永不过期）'");
        comment!("COMMENT ON COLUMN dashboard_snapshots.html_content IS '完整 HTML 快照内容'");

        comment!("COMMENT ON TABLE dashboard_schedules IS '仪表盘定时快照调度表'");
        comment!("COMMENT ON COLUMN dashboard_schedules.id IS '调度唯一标识（UUID）'");
        comment!("COMMENT ON COLUMN dashboard_schedules.dashboard_id IS '所属仪表盘 ID'");
        comment!("COMMENT ON COLUMN dashboard_schedules.enabled IS '是否启用定时任务'");
        comment!("COMMENT ON COLUMN dashboard_schedules.date_mode IS '数据日期模式：dashboard / today / yesterday'");
        comment!("COMMENT ON COLUMN dashboard_schedules.last_run_at IS '上次执行时间'");
        comment!("COMMENT ON COLUMN dashboard_schedules.next_run_at IS '下次计划执行时间'");
        comment!("COMMENT ON COLUMN dashboard_schedules.created_at IS '创建时间'");
        comment!("COMMENT ON COLUMN dashboard_schedules.updated_at IS '更新时间'");
        comment!("COMMENT ON COLUMN dashboard_schedules.cron_expr IS 'Cron 表达式（如 0 16 * * *）'");

        comment!("COMMENT ON TABLE datasources IS 'SQL 数据源配置表'");
        comment!("COMMENT ON COLUMN datasources.id IS '数据源唯一标识（UUID）'");
        comment!("COMMENT ON COLUMN datasources.name IS '数据源名称'");
        comment!("COMMENT ON COLUMN datasources.description IS '数据源描述'");
        comment!("COMMENT ON COLUMN datasources.db_type IS '数据库类型（如 postgres）'");
        comment!("COMMENT ON COLUMN datasources.host IS '数据库主机地址'");
        comment!("COMMENT ON COLUMN datasources.port IS '数据库端口'");
        comment!("COMMENT ON COLUMN datasources.database IS '数据库名'");
        comment!("COMMENT ON COLUMN datasources.username IS '连接用户名'");
        comment!("COMMENT ON COLUMN datasources.password IS '连接密码（加密存储）'");
        comment!("COMMENT ON COLUMN datasources.created_at IS '创建时间'");
        comment!("COMMENT ON COLUMN datasources.updated_at IS '更新时间'");

        comment!("COMMENT ON TABLE seaql_migrations IS 'SeaORM 数据库迁移版本记录表'");
        comment!("COMMENT ON COLUMN seaql_migrations.version IS '迁移版本号'");
        comment!("COMMENT ON COLUMN seaql_migrations.applied_at IS '迁移应用时间'");

        comment!(r#"
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'business_systems'
  ) THEN
    EXECUTE 'COMMENT ON TABLE business_systems IS ''业务系统模板配置表（遗留）''';
    EXECUTE 'COMMENT ON COLUMN business_systems."references" IS ''业务系统面板与数据源引用（JSON）''';
  END IF;
END $$;
"#);

        comment!(r#"
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'calendar'
  ) THEN
    EXECUTE 'COMMENT ON TABLE calendar IS ''交易日历表''';
    EXECUTE 'COMMENT ON COLUMN calendar.market IS ''市场/交易所代码''';
    EXECUTE 'COMMENT ON COLUMN calendar.date IS ''日期（YYYY-MM-DD）''';
    EXECUTE 'COMMENT ON COLUMN calendar.weekday IS ''星期''';
    EXECUTE 'COMMENT ON COLUMN calendar.quater IS ''季度''';
    EXECUTE 'COMMENT ON COLUMN calendar.weeknum IS ''年内周序号''';
    EXECUTE 'COMMENT ON COLUMN calendar.trade_flag IS ''交易标志''';
    EXECUTE 'COMMENT ON COLUMN calendar.remark IS ''备注''';
    EXECUTE 'COMMENT ON COLUMN calendar.holiday IS ''是否节假日（0/1）''';
  END IF;
END $$;
"#);

        for table in ["net_work_metrics", "net_work_metrics_1"] {
            comment!(&format!(
                r#"
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = '{table}'
  ) THEN
    EXECUTE 'COMMENT ON TABLE {table} IS ''网络容量指标明细表（遗留，供 SQL 查询）''';
    EXECUTE 'COMMENT ON COLUMN {table}.id IS ''记录唯一标识''';
    EXECUTE 'COMMENT ON COLUMN {table}.created_at IS ''数据日期/创建时间''';
    EXECUTE 'COMMENT ON COLUMN {table}.updated_at IS ''更新时间''';
    EXECUTE 'COMMENT ON COLUMN {table}.deleted_at IS ''软删除时间''';
    EXECUTE 'COMMENT ON COLUMN {table}.node IS ''节点类型（如 DCI线路、核心交换机）''';
    EXECUTE 'COMMENT ON COLUMN {table}.category IS ''指标类别''';
    EXECUTE 'COMMENT ON COLUMN {table}.metrics IS ''指标名称''';
    EXECUTE 'COMMENT ON COLUMN {table}.unit IS ''数值单位（如 %）''';
    EXECUTE 'COMMENT ON COLUMN {table}.current_value_source_id IS ''当前值数据来源 ID''';
    EXECUTE 'COMMENT ON COLUMN {table}.current_value IS ''当前值''';
    EXECUTE 'COMMENT ON COLUMN {table}.historical_peak_source_id IS ''历史峰值数据来源 ID''';
    EXECUTE 'COMMENT ON COLUMN {table}.historical_peak IS ''历史峰值''';
    EXECUTE 'COMMENT ON COLUMN {table}.wow_change IS ''周同比变化（%）''';
    EXECUTE 'COMMENT ON COLUMN {table}.dod_change IS ''日环比变化（%）''';
  END IF;
END $$;
"#
            ));
        }

        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        Ok(())
    }
}
