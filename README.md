# CMP 容量管理平台

基于 Grafana 设计理念的全栈容量管理平台。

## 技术栈

| 层 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite 6 + Ant Design 6 + ECharts |
| 后端 | Rust (actix-web 4) + SeaORM + sqlx |
| 数据库 | PostgreSQL (Docker) |

## 快速启动

```bash
# 开发模式（前端 HMR + 后端热重载）
./start.sh dev

# 停止
./stop.sh
```

| 服务 | 端口 |
|------|------|
| Frontend | `3100` |
| Backend | `3101` |
| PostgreSQL | `5432` |

## 文档

- [📦 前端详细文档](./frontend/README.md)
- [🦀 后端详细文档](./backend/README.md)

## 核心功能

- 仪表盘可视化编辑（拖拽布局、折线图/柱状图/表格）
- 数据源管理（PostgreSQL 连接 CRUD，密码加密存储）
- SQL 查询编辑器（Builder / Code 双模式，参照 Grafana）
- 数据库 schema 自动发现（表/列下拉选择）
- 通用 SQL 执行 API
- JWT 认证 + RBAC 权限

## License

MIT
