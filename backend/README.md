# Backend — CMP 容量管理平台

Rust + actix-web + SeaORM 后端 API 服务。

## 技术栈

| 组件 | 库 |
|------|-----|
| 框架 | actix-web 4 |
| ORM | SeaORM 1.1 (sqlx-postgres) |
| 直接 SQL | sqlx 0.8 |
| 序列化 | serde / serde_json |
| 认证 | JWT (jsonwebtoken) + bcrypt |
| 加密 | AES-256-GCM (aes-gcm) |
| 日期 | chrono 0.4 |
| 迁移 | sea-orm-migration |
| 日志 | env_logger + log |
| UUID | uuid v4 |

## 目录结构

```
backend/
├── src/
│   ├── main.rs                     # 入口、路由注册、启动种子
│   ├── config.rs                   # 环境变量配置
│   ├── db.rs                       # 数据库连接 + 迁移
│   ├── handlers/
│   │   ├── mod.rs
│   │   ├── admin.rs                # 用户/角色/权限 CRUD
│   │   ├── auth.rs                 # 登录 + 个人信息
│   │   ├── dashboards.rs           # 仪表盘 CRUD + 快照 + 定时
│   │   ├── datasources.rs          # 数据源 CRUD + SQL 查询 + schema 发现
│   │   └── metrics.rs              # 网络指标（legacy）
│   ├── services/
│   │   ├── mod.rs
│   │   ├── auth.rs                 # JWT 签发校验、用户校验、权限校验
│   │   ├── users.rs                # 用户 CRUD
│   │   ├── roles.rs                # 角色/权限管理
│   │   ├── dashboards.rs           # 仪表盘业务逻辑
│   │   ├── datasources.rs          # 数据源 CRUD、密码加密、SQL 执行
│   │   ├── metrics.rs              # 网络指标查询
│   │   └── snapshots.rs            # 快照调度
│   ├── models/
│   │   ├── api.rs                  # ApiResponse + 网络指标/数据源 DTO
│   │   ├── auth.rs                 # 认证请求/响应
│   │   ├── dashboard.rs            # 仪表盘请求
│   │   └── snapshot.rs             # 快照模型
│   ├── entity/                     # SeaORM 实体
│   │   ├── users.rs, roles.rs, permissions.rs, ...
│   │   ├── dashboards.rs, datasources.rs, ...
│   │   ├── mod.rs
│   │   └── prelude.rs
│   ├── migration/                  # 数据库迁移
│   │   ├── m20250602_000001_create_auth_tables.rs
│   │   ├── m20250603_000002_create_dashboards.rs
│   │   ├── m20250603_000003_create_snapshots.rs
│   │   ├── m20250603_000004_create_datasources.rs
│   │   └── mod.rs
│   └── app_middleware/
│       ├── mod.rs
│       └── auth.rs                 # JWT 中间件
├── Cargo.toml
├── .env
├── start.sh                        # 启动脚本
├── stop.sh
└── dev.sh                          # cargo-watch 热重载
```

## API 接口

统一响应格式：

```json
{
  "errorCode": "00000",
  "errorMessage": "",
  "success": true,
  "data": ...
}
```

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/auth/login` | 登录，返回 JWT token |
| `GET` | `/api/auth/me` | 当前用户信息（需认证） |

### 仪表盘 (需认证)

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/dashboards/` | 列表 |
| `POST` | `/api/dashboards/` | 创建 |
| `GET` | `/api/dashboards/{id}` | 详情 |
| `PUT` | `/api/dashboards/{id}` | 更新 |
| `DELETE` | `/api/dashboards/{id}` | 删除 |
| `GET` | `/api/dashboards/{id}/snapshots` | 快照列表 |
| `POST` | `/api/dashboards/{id}/snapshots` | 创建快照 |
| `DELETE` | `/api/dashboards/{id}/snapshots/{snId}` | 删除快照 |
| `GET` | `/api/dashboards/{id}/schedule` | 定时配置 |
| `PUT` | `/api/dashboards/{id}/schedule` | 更新定时 |

### 数据源 (需认证)

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/datasources` | 列表 |
| `POST` | `/api/datasources` | 创建 |
| `GET` | `/api/datasources/{id}` | 详情 |
| `PUT` | `/api/datasources/{id}` | 更新 |
| `DELETE` | `/api/datasources/{id}` | 删除 |
| `POST` | `/api/datasources/{id}/query` | **通用 SQL 查询** |
| `GET` | `/api/datasources/{id}/tables` | 列出所有表 |
| `GET` | `/api/datasources/{id}/tables/{table}/columns` | 列出表的列 |

### SQL 查询接口

`POST /api/datasources/{id}/query`

```json
// 请求
{ "sql": "SELECT id, username, is_active FROM users LIMIT 10" }

// 响应
{
  "fields": [
    { "name": "id", "label": "id", "type": "string" },
    { "name": "username", "label": "username", "type": "string" },
    { "name": "is_active", "label": "is_active", "type": "string" }
  ],
  "rows": [
    { "id": "...", "username": "admin", "is_active": true }
  ]
}
```

支持 PostgreSQL 全类型转换：String, i32, i64, f32, f64, bool, UUID, NaiveDate, NaiveDateTime, DateTime<Utc>。

### 管理接口 (需认证 + 权限)

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET/POST` | `/api/admin/users` | 用户管理 |
| `PUT/DELETE` | `/api/admin/users/{id}` | 用户操作 |
| `GET/POST` | `/api/admin/roles` | 角色管理 |
| `PUT/DELETE` | `/api/admin/roles/{id}` | 角色操作 |
| `PUT` | `/api/admin/roles/{id}/permissions` | 更新角色权限 |
| `GET` | `/api/admin/permissions` | 权限列表 |
| `GET` | `/api/admin/permissions/grouped` | 权限分组 |

### 其他

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/health` | 健康检查（K8s 探针由部署层实现） |
| `GET` | `/snapshots/{key}` | 快照 HTML 视图 |
| `POST` | `/api/v1/ops_dbapi/api/business_systems` | 业务系统模板 (legacy) |

## 数据源密码加密

密码使用 AES-256-GCM 加密存储，密钥由 `JWT_SECRET` 派生：

1. 取 `JWT_SECRET` 前 32 字节作为 AES-256 密钥
2. 每次加密生成 12 字节随机 nonce
3. nonce + 密文拼接后 Base64 编码存入 DB
4. 解密时从 Base64 分离 nonce 和密文

## 启动种子

服务启动时自动执行：

1. 运行数据库迁移（sea-orm-migration）
2. 创建默认仪表盘 "数据概览"（含 SQL 查询面板）
3. 创建默认数据源 "CMP 数据库"（当前 DATABASE_URL 连接）

## 环境变量

`backend/.env`:

```env
DATABASE_URL=postgres://postgres:postgres123@localhost:5432/cmp_service
SERVER_HOST=127.0.0.1
SERVER_PORT=3101
JWT_SECRET=cmp-dev-secret-change-in-production
JWT_EXPIRES_HOURS=24
PUBLIC_BASE_URL=http://localhost:3100
RUST_LOG=info,cmp_backend=info,actix_web=info,sqlx=warn,sea_orm=warn
SQLX_LOG=false
```

## 日志

使用 **`log` + `env_logger`**，HTTP 访问日志由 Actix `Logger` 中间件输出。

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `RUST_LOG` | `info,cmp_backend=info,actix_web=info,sqlx=warn,sea_orm=warn` | 分级过滤，见 [env_logger](https://docs.rs/env_logger/) |
| `SQLX_LOG` | `false` | 设为 `true` 时打印 SQL 语句（排查数据问题时开启） |

示例：

```bash
# 只看本服务 debug，仍不打印 SQL
RUST_LOG=cmp_backend=debug ./target/debug/cmp-backend

# 临时打开 SQL 日志
SQLX_LOG=true RUST_LOG=sqlx=debug,sea_orm=debug ./target/debug/cmp-backend
```

## 启动

```bash
cd backend
./dev.sh            # cargo-watch 热重载
./start.sh          # 启动 + PostgreSQL 容器
./stop.sh           # 停止
./status.sh         # 检查是否在运行
```
