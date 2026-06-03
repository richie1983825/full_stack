import type { Dashboard, DataSource } from '../../types';
import { brand } from '../../theme/colors';

// ============ 示例数据源 ============

let nextId = 100;

export function newMockDsId(): string {
  return `ds-${nextId++}`;
}

export const sampleDataSources: DataSource[] = [
  {
    id: 'ds-0',
    name: 'CMP 数据库',
    description: 'CMP 容量管理平台自身数据库',
    dbType: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'cmp_service',
    username: 'postgres',
    createdAt: '2026-06-03T00:00:00Z',
    updatedAt: '2026-06-03T00:00:00Z',
  },
  {
    id: 'ds-1',
    name: '销售数据库',
    description: '按地区和产品类别的月度销售数据',
    dbType: 'postgres',
    host: '192.168.1.100',
    port: 5432,
    database: 'sales_db',
    username: 'reader',
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-06-20T08:30:00Z',
  },
  {
    id: 'ds-2',
    name: '用户行为分析',
    description: '平台用户活跃与留存数据',
    dbType: 'postgres',
    host: '192.168.1.101',
    port: 5432,
    database: 'analytics',
    username: 'analyst',
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-06-18T12:00:00Z',
  },
  {
    id: 'ds-3',
    name: '系统监控',
    description: '服务性能与错误监控指标',
    dbType: 'postgres',
    host: '10.0.0.50',
    port: 5432,
    database: 'monitor',
    username: 'monitor_user',
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-06-19T09:00:00Z',
  },
];

// ============ 示例仪表盘 ============

export const sampleDashboards: Dashboard[] = [
  {
    id: 'db-1',
    title: '业务概览',
    description: '核心业务指标总览',
    panels: [
      {
        id: 'panel-1',
        title: '月度营收趋势',
        chartType: 'line',
        grid: { x: 0, y: 0, w: 6, h: 3 },
        dataSourceId: 'ds-1',
        option: {
          xAxis: { type: 'category', data: ['1月', '2月', '3月', '4月', '5月', '6月'] },
          yAxis: { type: 'value' },
          series: [
            {
              name: '华东',
              type: 'line',
              data: [820, 932, 901, 934, 1290, 1330],
              smooth: true,
            },
            {
              name: '华南',
              type: 'line',
              data: [620, 732, 701, 834, 990, 1130],
              smooth: true,
            },
            {
              name: '华北',
              type: 'line',
              data: [520, 632, 601, 734, 890, 930],
              smooth: true,
            },
          ],
          tooltip: { trigger: 'axis' },
          legend: { bottom: 0 },
        },
      },
      {
        id: 'panel-2',
        title: '产品类别占比',
        chartType: 'pie',
        grid: { x: 6, y: 0, w: 3, h: 3 },
        dataSourceId: 'ds-1',
        option: {
          tooltip: { trigger: 'item' },
          legend: { bottom: 0 },
          series: [
            {
              type: 'pie',
              radius: ['40%', '70%'],
              data: [
                { value: 1048, name: '电子产品' },
                { value: 735, name: '家居用品' },
                { value: 580, name: '服装' },
                { value: 484, name: '食品' },
                { value: 300, name: '其他' },
              ],
            },
          ],
        },
      },
      {
        id: 'panel-3',
        title: '各区域订单量',
        chartType: 'bar',
        grid: { x: 9, y: 0, w: 3, h: 3 },
        dataSourceId: 'ds-1',
        option: {
          xAxis: { type: 'category', data: ['华东', '华南', '华北', '西南', '华中'] },
          yAxis: { type: 'value' },
          series: [
            {
              type: 'bar',
              data: [3200, 2800, 2400, 1800, 1600],
              itemStyle: {
                color: {
                  type: 'linear',
                  x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [
                    { offset: 0, color: brand[500] },
                    { offset: 1, color: brand[300] },
                  ],
                },
              },
            },
          ],
        },
      },
      {
        id: 'panel-4',
        title: '日活用户趋势',
        chartType: 'area',
        grid: { x: 0, y: 3, w: 6, h: 3 },
        dataSourceId: 'ds-2',
        option: {
          xAxis: {
            type: 'category',
            data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
          },
          yAxis: { type: 'value' },
          series: [
            {
              name: '日活',
              type: 'line',
              areaStyle: { opacity: 0.3 },
              data: [12500, 13200, 12800, 14100, 13800, 15200, 14800],
              smooth: true,
            },
          ],
          tooltip: { trigger: 'axis' },
        },
      },
      {
        id: 'panel-5',
        title: '服务 QPS',
        chartType: 'line',
        grid: { x: 6, y: 3, w: 6, h: 3 },
        dataSourceId: 'ds-3',
        option: {
          xAxis: {
            type: 'category',
            data: ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30'],
          },
          yAxis: { type: 'value' },
          series: [
            {
              name: 'API Gateway',
              type: 'line',
              data: [3200, 4500, 5100, 4800, 4200, 3800],
              smooth: true,
            },
            {
              name: 'User Service',
              type: 'line',
              data: [1800, 2300, 2600, 2400, 2000, 1700],
              smooth: true,
            },
          ],
          tooltip: { trigger: 'axis' },
          legend: { bottom: 0 },
        },
      },
    ],
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-06-20T08:30:00Z',
  },
];
