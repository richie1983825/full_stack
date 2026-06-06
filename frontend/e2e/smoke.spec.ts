import { test, expect } from '@playwright/test';

test('首页加载并显示仪表盘列表', async ({ page }) => {
  await page.goto('/');
  // 页面标题
  await expect(page.locator('h2')).toContainText('/');
  // 表格存在
  await expect(page.locator('.ant-table')).toBeVisible();
});

test('顶部导航菜单可点击', async ({ page }) => {
  await page.goto('/');
  // 点击数据源菜单
  await page.locator('.ant-menu-item').filter({ hasText: '数据源' }).click();
  await expect(page.locator('h2')).toContainText('数据源管理');
});

test('仪表盘详情页加载', async ({ page }) => {
  // 直接访问已知仪表盘
  await page.goto('/dashboards/00000000-0000-0000-0000-000000000301');
  await expect(page.locator('h2')).toContainText('仪表盘创建趋势');
  // 图表面板存在
  await expect(page.locator('.dashboard-grid')).toBeVisible();
});
