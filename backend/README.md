# CMP Backend

容量管理平台（Capacity Management Platform）后端服务，基于 Rust 构建的 RESTful API 服务，数据来源于 PostgreSQL。

## 技术栈

| 组件 | 版本/库 |
|------|---------|
| Rust | 1.96.0 (stable) |
| Web 框架 | actix-web 4 |
| 异步 ORM | sqlx 0.8 (PostgreSQL) |
| 序列化 | serde / serde_json |
| 日期处理 | chrono 0.4 |
| 跨域 | actix-cors |
| 日志 | env_logger + log |

## 工程结构

```
backend/
├── Cargo.toml          # 依赖配置
├── .env                # 环境变量（数据库连接、服务器配置）
├── README.md
└── src/
    ├── main.rs         # 服务器启动、路由注册、CORS 中间件
    ├── config.rs       # 环境变量读取与配置结构
    ├── db.rs           # 数据库连接池、SQL 查询
    ├── models.rs       # 请求/响应数据结构
    └── handlers.rs     # API 路由处理函数
```

## 数据库

- **数据库**: PostgreSQL (Docker 容器 `postgres-cmp`)
- **连接池**: sqlx PgPool，最大 10 连接
- **数据库名**: `cmp_service`

### 数据表

| 表名 | 说明 | 记录数 |
|------|------|--------|
| `business_systems` | 业务系统模板 JSON | 1 |
| `calendar` | 交易日历 | 6,842 |
| `net_work_metrics` | 网络指标数据 | 956 |
| `net_work_metrics_1` | 网络指标数据（副本） | 156 |

## API 接口

所有接口返回统一格式：

```json
{
    "errorCode": "00000",
    "errorMessage": "",
    "success": true,
    "data": ...
}
```

### 1. 健康检查

```
GET /health
```

### 2. 获取网络指标数据

```
POST /api/v1/ops_dbapi/api/network_metrics
Content-Type: application/json

{
    "params": {
        "date": "2026-05-13"
    }
}
```

**入参**: `params.date` - 日期字符串 (YYYY-MM-DD)

**数据来源**: `net_work_metrics` UNION `net_work_metrics_1`，按 `created_at::date` 过滤

**字段映射** (DB 列 → API 字段):

| DB 列 | API 字段 | 说明 |
|-------|----------|------|
| `id` | `id` | 主键 |
| `created_at` | `created_at` | 创建时间 |
| `updated_at` | `updated_at` | 更新时间 |
| `node` | `node_type` | 节点类型 |
| `category` | `metric_category` | 指标类别 |
| `metrics` | `metric_name` | 指标名称 |
| `unit` | `unit` | 单位 |
| `current_value` | `current_value` | 当前值 |
| `historical_peak` | `historical_peak` | 历史峰值 |
| `dod_change` | `mom_change` | 环比（日环比） |
| `wow_change` | `yoy_change` | 周同比 |

**返回示例**:

```json
{
    "errorCode": "00000",
    "success": true,
    "data": [
        {
            "id": "2054740082937700352",
            "created_at": "2026-05-13T00:00:00",
            "updated_at": null,
            "node_type": "DCI线路",
            "metric_category": "资源使用率",
            "metric_name": "南方-威新主53口联通裸纤40G",
            "unit": "%",
            "current_value": "6.652",
            "historical_peak": "6.652",
            "mom_change": "1.1",
            "yoy_change": "-1.1"
        }
    ]
}
```

### 3. 获取业务系统模板数据

```
POST /api/v1/ops_dbapi/api/business_systems
Content-Type: application/json

{
    "params": {
        "id": "1"
    }
}
```

**入参**: `params.id` - 业务系统 ID（当前版本忽略此参数）

**返回**: `business_systems` 表的 `references` 字段内容（JSON 对象），包含仪表盘面板配置等信息。

## 快速启动

### 一键启动（推荐）

```bash
cd ~/Documents/full_stack

# 启动所有服务（Mock 模式）
./start.sh

# 启动所有服务（连接真实后端）
./start.sh real

# 停止所有服务
./stop.sh
```

`full_stack/` 下的一键脚本会依次调用各子服务的启停脚本：

| 脚本 | 功能 |
|------|------|
| `full_stack/start.sh [mock\|real]` | 一键启动 Backend + Frontend |
| `full_stack/stop.sh` | 一键停止 Frontend + Backend + PostgreSQL |

### 按服务启停

每个服务也可独立启停：

```bash
# ==== Backend ====
cd ~/Documents/full_stack/backend
./start.sh          # 启动 PostgreSQL + 编译 + 运行 Backend
./stop.sh           # 停止 Backend

# ==== Frontend ====
cd ~/Documents/full_stack/frontend
./start.sh          # Mock 模式启动
./start.sh real     # 连接真实后端启动
./stop.sh           # 停止 Frontend
```

| 服务 | 端口 | 说明 |
|------|------|------|
| PostgreSQL (Docker) | 5432 | `postgres-cmp` 容器 |
| Backend (Rust) | 3010 | actix-web API 服务 |
| Frontend (Vite) | 3000 | React 开发服务器 |

启动后访问：
- **前端页面**: http://localhost:3000
- **后端 API**: http://localhost:3010
- **健康检查**: http://localhost:3010/health

日志文件：
- `backend/backend.log` — 后端日志
- `frontend/frontend.log` — 前端日志

### 开发模式（热重启）

Backend 使用 [cargo-watch](https://github.com/watchexec/cargo-watch) 监听源码变更并自动重新编译、重启：

```bash
# 仅 Backend（前台，推荐日常开发）
cd ~/Documents/full_stack/backend
./dev.sh

# 一键启动：Backend cargo-watch + Frontend Vite HMR
cd ~/Documents/full_stack
./start.sh dev

# 查看后台日志
tail -f backend/backend.log
```

首次运行会自动执行 `cargo install cargo-watch`。监听范围：`src/`、`Cargo.toml`、`.env`。

### 手动启动

```bash
# 1. 启动 PostgreSQL
docker start postgres-cmp

# 2. 编译并启动 Backend
cd ~/Documents/full_stack/backend
cargo run
# 服务监听于 http://127.0.0.1:3010

# 3. 启动 Frontend（另一个终端）
cd ~/Documents/full_stack/frontend
VITE_ENABLE_MOCK=false npm run dev
# 前端访问 http://localhost:3000
```

## 环境变量

`.env` 文件配置：

```env
DATABASE_URL=postgres://postgres:postgres123@localhost:5432/cmp_service
SERVER_HOST=127.0.0.1
SERVER_PORT=3010
```
