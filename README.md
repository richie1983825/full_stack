# CMP 容量管理平台

基于 Grafana 设计理念的全栈容量管理平台，支持仪表盘可视化、SQL 数据源管理、图表组件编辑。

## 技术栈

| 层 | 技术 |
|------|------|
| **前端** | React 19 + TypeScript + Vite 6 + Ant Design 6 + ECharts |
| **后端** | Rust (actix-web 4) + SeaORM + sqlx |
| **数据库** | PostgreSQL (Docker) |
| **状态管理** | Zustand |
| **路由** | React Router v7 |
| **Mock** | MSW (Mock Service Worker) |
| **认证** | JWT (jsonwebtoken) + bcrypt |

## 工程结构

```
full_stack/
├── start.sh                    # 一键启动所有服务
├── stop.sh                     # 一键停止所有服务
├── backend/                    # Rust 后端
│   ├── src/
│   │   ├── main.rs             # 入口、路由注册
│   │   ├── handlers/           # HTTP 处理器
│   │   │   ├── admin.rs        # 用户/角色/权限管理
│   │   │   ├── auth.rs         # 登录认证
│   │   │   ├── dashboards.rs   # 仪表盘 CRUD
│   │   │   ├── datasources.rs  # 数据源管理 + SQL 查询
│   │   │   └── metrics.rs      # 网络指标（legacy）
│   │   ├── services/           # 业务逻辑
│   │   │   ├── datasources.rs  # 数据源 CRUD + 密码加密 + SQL 执行
│   │   │   ├── dashboards.rs   # 仪表盘服务
│   │   │   ├── auth.rs         # 认证服务
│   │   │   └── users.rs        # 用户服务
│   │   ├── models/             # 数据结构
│   │   ├── entity/             # SeaORM 实体
│   │   ├── migration/          # 数据库迁移
│   │   └── app_middleware/     # 中间件
│   └── Cargo.toml
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── pages/
│   │   │   ├── DashboardEditorPage.tsx   # 仪表盘编辑器
│   │   │   ├── DashboardListPage.tsx     # 仪表盘列表
│   │   │   ├── DataSourcePage.tsx        # 数据源管理
│   │   │   └── admin/                    # 用户/角色/权限管理
│   │   ├── components/
│   │   │   └── Dashboard/
│   │   │       ├── PanelEditorModal.tsx   # 编辑组件弹窗
│   │   │       ├── SqlQueryEditor.tsx     # SQL 查询编辑器 (Builder/Code)
│   │   │       ├── PanelCard.tsx          # 面板卡片
│   │   │       └── DashboardGrid.tsx      # 网格布局
│   │   ├── api/                # API 客户端
│   │   ├── stores/             # Zustand 状态管理
│   │   ├── types/              # TypeScript 类型
│   │   ├── utils/              # 工具函数
│   │   └── mocks/              # MSW Mock 数据
│   └── vite.config.ts
└── scripts/                    # E2E 测试脚本
```

## 快速启动

### 开发模式（推荐）

```bash
# 启动所有服务（前端 HMR + 后端 cargo-watch 热重启）
./start.sh dev

# 停止所有服务
./stop.sh
```

| 服务 | 端口 | 说明 |
|------|------|------|
| Frontend | `3100` | Vite HMR |
| Backend | `3101` | actix-web |
| PostgreSQL | `5432` | Docker `postgres-cmp` |

### 启动模式

| 命令 | 说明 |
|------|------|
| `./start.sh` 或 `./start.sh mock` | Mock 模式（MSW 拦截 API） |
| `./start.sh real` | 真实后端模式 |
| `./start.sh dev` | 开发模式（前后端均热重载） |

### 环境要求

- Node.js ≥ 18
- Rust (stable)
- Docker (PostgreSQL)
- cargo-watch: `cargo install cargo-watch`

## 核心功能

### 1. 仪表盘管理

- 创建/编辑/删除仪表盘
- 拖拽布局（react-grid-layout）
- 添加折线图、柱状图、表格组件
- JSON 配置导入/导出
- 快照生成与分享

### 2. 数据源管理（Grafana 风格）

在顶部菜单栏「数据源」中管理数据库连接：

- 支持 PostgreSQL（优先）、MySQL
- 连接信息的增删改查
- 密码 AES-256-GCM 加密存储
- 启动时自动播种 CMP 自身数据库为默认数据源

### 3. SQL 查询编辑器（Builder / Code 双模式）

编辑组件时，通过数据源 + SQL 配置数据查询：

| 模式 | 说明 |
|------|------|
| **Builder** | 可视化构建 SQL：下拉选择表名 → 字段多选 → WHERE / ORDER BY |
| **Code** | 直接编写原始 SQL 语句 |

- Builder 默认模式（新面板）
- Builder → Code：自动生成 SQL
- Code → Builder：弹出确认对话框（Grafana 风格）
- 表名和字段下拉从数据库 schema 自动发现
- 执行预览后字段下拉切换为查询结果的实际输出列（含别名）

### 4. 通用 SQL 执行 API

```
POST /api/datasources/{id}/query
{ "sql": "SELECT * FROM users LIMIT 10" }
```

- 动态连接目标数据库执行任意 SQL
- 支持全部 PostgreSQL 数据类型（int/float/bool/uuid/date/timestamp）
- 返回结构化 `{ fields, rows }` 结果

### 5. Grafana 风格数据流

```
加载: DB(无 option) → hydratePanels(SQL) → 渲染图表
保存: 图表(含 option) → strip option → DB(仅配置)
```

仪表盘 JSON 仅存储配置元数据（id, title, chartType, grid, query），数据始终从 SQL 实时查询，与 Grafana 一致。

### 6. 认证与权限

- JWT 登录认证
- RBAC 角色权限管理
- 用户/角色/权限的 CRUD 管理

## 环境变量

**backend/.env**:

```env
DATABASE_URL=postgres://postgres:postgres123@localhost:5432/cmp_service
SERVER_HOST=127.0.0.1
SERVER_PORT=3101
JWT_SECRET=cmp-dev-secret-change-in-production
JWT_EXPIRES_HOURS=24
```

**frontend/.env.development**:

```env
VITE_ENABLE_MOCK=false
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://localhost:3101
```

## 数据库表

| 表 | 说明 |
|------|------|
| `users` | 用户 |
| `roles` | 角色 |
| `permissions` | 权限 |
| `role_permissions` | 角色-权限关联 |
| `user_roles` | 用户-角色关联 |
| `dashboards` | 仪表盘（JSONB panels） |
| `dashboard_schedules` | 快照定时任务 |
| `dashboard_snapshots` | 快照记录 |
| `datasources` | 数据源连接配置 |

## License

MIT
