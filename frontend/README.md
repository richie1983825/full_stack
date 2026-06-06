# Frontend — CMP 容量管理平台

React + TypeScript + Vite 前端应用。

## 技术栈

| 组件 | 库 |
|------|-----|
| 框架 | React 19 |
| 语言 | TypeScript |
| 构建 | Vite 6 |
| UI | Ant Design 6 |
| 图表 | ECharts (echarts-for-react) |
| 状态管理 | Zustand |
| 路由 | React Router v7 |
| Mock | MSW (Mock Service Worker) |
| 日期 | dayjs |
| 布局 | react-grid-layout |

## 目录结构

```
frontend/
├── src/
│   ├── main.tsx                  # 入口，MSW + ConfigProvider
│   ├── App.tsx                   # 根组件
│   ├── router.tsx                # 路由定义
│   ├── pages/
│   │   ├── DashboardListPage.tsx   # 仪表盘列表（首页）
│   │   ├── DashboardEditorPage.tsx # 仪表盘编辑器
│   │   ├── DataSourcePage.tsx      # 数据源 CRUD 管理
│   │   ├── LoginPage.tsx           # 登录
│   │   └── admin/                  # 用户/角色/权限管理
│   ├── components/
│   │   ├── Dashboard/
│   │   │   ├── DashboardGrid.tsx   # react-grid-layout 网格
│   │   │   ├── PanelCard.tsx       # 面板卡片（编辑/删除菜单）
│   │   │   ├── PanelEditorModal.tsx # 编辑组件弹窗
│   │   │   ├── SqlQueryEditor.tsx  # SQL 查询编辑器
│   │   │   ├── SnapshotDrawer.tsx  # 快照管理抽屉
│   │   │   └── DashboardJsonDrawer.tsx # JSON 配置抽屉
│   │   ├── Charts/ChartRenderer.tsx # ECharts 渲染器
│   │   ├── Chat/                    # AI 对话面板
│   │   └── Layout/                  # 首页设置
│   ├── layouts/
│   │   └── GrafanaLayout.tsx        # 顶部菜单 + 布局壳
│   ├── api/                         # API 客户端
│   │   ├── client.ts                # 通用 HTTP 封装
│   │   ├── endpoints.ts             # 路径常量
│   │   ├── datasource.ts            # 数据源 API
│   │   ├── dashboard.ts             # 仪表盘 API
│   │   ├── admin.ts                 # 管理 API
│   │   └── auth.ts                  # 认证 API
│   ├── stores/                      # Zustand 状态
│   │   ├── useDashboardStore.ts     # 仪表盘状态
│   │   ├── useAuthStore.ts          # 认证状态
│   │   └── useHomePageStore.ts      # 首页偏好
│   ├── types/
│   │   ├── dashboard.ts             # 面板/仪表盘/查询类型
│   │   └── index.ts                 # 数据源/字段类型
│   ├── utils/
│   │   ├── panelData.ts             # 面板数据水合（SQL → ECharts option）
│   │   ├── panelTemplates.ts        # 默认面板模板
│   │   └── snapshotHtml.ts          # 快照 HTML 生成
│   ├── mocks/
│   │   ├── handlers.ts              # MSW 路由 mock
│   │   ├── services/index.ts        # Mock 后端逻辑
│   │   └── data/sampleData.ts       # 示例数据
│   └── constants/
│       └── defaultPanelQuery.ts   # 默认 SQL 查询
├── .env.development                 # 开发环境变量
├── vite.config.ts                   # Vite 配置 + API 代理
└── package.json
```

## 数据流（Grafana 风格）

```
页面加载:
  DB 返回 panels (无 option)
    → hydratePanels() 调用 datasourceApi.query(id, sql)
      → buildChartFromSqlResult() 构建 ECharts option
        → ChartRenderer 渲染

保存:
  panels (含 option) → 剥离 option → API 存储 panels (仅配置)
    → hydratePanels() 重新水合 → 渲染
```

- `PanelConfig.option` 为运行时字段，不持久化
- 数据始终从 SQL 实时查询

## 核心组件

### SqlQueryEditor — SQL 查询编辑器

位于 `PanelEditorModal` 中，参照 Grafana 设计：

| 模式 | 说明 |
|------|------|
| Builder（默认） | 下拉选表 → 字段多选 → WHERE → ORDER BY → 自动生成 SQL |
| Code | 直接编写原始 SQL |

- Builder → Code：自动生成 SQL
- Code → Builder：弹出确认对话框（不自动解析）
- 表名/字段从后端 `GET /api/datasources/{id}/tables` 和 `/columns` 实时获取
- 执行预览后，字段下拉切换为查询结果的实际输出列（包含别名如 `AS day`）

### PanelEditorModal — 编辑组件

编辑单个面板的标题、图表类型（折线图/柱状图/表格）、布局位置、数据源 + SQL 查询。

### ChartRenderer — 图表渲染

根据 `panel.chartType` 和 `panel.option` 渲染 ECharts：

| chartType | 渲染 |
|-----------|------|
| `line` | `<ReactECharts option={...} />` |
| `bar` | `<ReactECharts option={...} />` |
| `table` | `<Table dataSource rows columns={fields} />` |

## 环境变量

`frontend/.env.development`:

```env
VITE_ENABLE_MOCK=false        # 启用 MSW Mock
VITE_API_BASE_URL=/api        # API 前缀
VITE_API_PROXY_TARGET=http://localhost:3101  # 代理目标
```

- `VITE_ENABLE_MOCK=false` → Vite 代理 `/api` 到后端
- `VITE_ENABLE_MOCK=true` → MSW 浏览器端拦截

## 启动

```bash
cd frontend
npm install
npm run dev          # 开发服务器 (3100)
npm run build        # 生产构建
```
