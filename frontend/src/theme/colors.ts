/** 全局暗蓝品牌色阶 */
export const brand = {
  900: '#0a1628',
  800: '#0f2847',
  700: '#163656',
  600: '#1d4570',
  500: '#2563ab',
  400: '#4a82c4',
  300: '#7aa8d9',
  100: '#e2ecf6',
  50: '#f0f6fc',
} as const;

/** 内容区操作色（按钮、链接、AI 入口等） */
export const colorPrimary = brand[500];

/** 顶栏导航背景 */
export const navBackground = brand[800];

/** 顶栏选中指示（深底上略浅，仍属同一色阶） */
export const navAccent = brand[400];

/** 主色浅背景（hover、选中条等） */
export const colorPrimaryBg = brand[50];

/** ECharts 系列色盘：以品牌蓝为主，保证多系列可区分 */
export const chartPalette = [
  brand[500],
  brand[400],
  brand[600],
  brand[300],
  brand[700],
] as const;
