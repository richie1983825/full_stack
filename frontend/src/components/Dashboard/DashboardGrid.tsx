import { useCallback, useEffect } from 'react';
import { GridLayout, useContainerWidth } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { Empty } from 'antd';
import type { PanelConfig } from '../../types/dashboard';
import { getTablePanelGridH } from '../../utils/panelData';
import PanelCard from './PanelCard';

interface DashboardGridProps {
  panels: PanelConfig[];
  editMode?: boolean;
  onPanelsChange: (panels: PanelConfig[]) => void;
  onEditPanel?: (panel: PanelConfig) => void;
}

export default function DashboardGrid({
  panels,
  editMode = true,
  onPanelsChange,
  onEditPanel,
}: DashboardGridProps) {
  const { width, containerRef, mounted } = useContainerWidth();

  const handleLayoutChange = useCallback(
    (layout: Layout) => {
      if (!editMode) return;
      const updatedPanels = panels.map((panel) => {
        const item = layout.find((l) => l.i === panel.id);
        if (item) {
          const h = panel.chartType === 'table' ? getTablePanelGridH(panel) : item.h;
          return { ...panel, grid: { x: item.x, y: item.y, w: item.w, h } };
        }
        return panel;
      });
      onPanelsChange(updatedPanels);
    },
    [editMode, onPanelsChange, panels],
  );

  // 表格面板高度随数据/分页配置同步到 store（避免持久化过大的 h）
  const needsTableHeightSync = panels.some(
    (panel) => panel.chartType === 'table' && panel.grid.h !== getTablePanelGridH(panel),
  );

  useEffect(() => {
    if (!needsTableHeightSync) return;
    const updated = panels.map((panel) => {
      if (panel.chartType !== 'table') return panel;
      const h = getTablePanelGridH(panel);
      if (panel.grid.h === h) return panel;
      return { ...panel, grid: { ...panel.grid, h } };
    });
    onPanelsChange(updated);
  }, [needsTableHeightSync, panels, onPanelsChange]);

  const handleDeletePanel = useCallback(
    (id: string) => {
      onPanelsChange(panels.filter((p) => p.id !== id));
    },
    [onPanelsChange, panels],
  );

  if (panels.length === 0) {
    return (
      <div className="dashboard-empty">
        <Empty description="暂无组件，点击「添加组件」创建折线图、柱状图或表格" />
      </div>
    );
  }

  const layout: Layout = panels.map((p) => {
    const base = { i: p.id, ...p.grid };
    if (p.chartType === 'table') {
      const h = getTablePanelGridH(p);
      return { ...base, h, minH: h, maxH: h, resizeHandles: ['e'] as const };
    }
    return base;
  });

  return (
    <div ref={containerRef} className="dashboard-container">
      {mounted && (
        <GridLayout
          className="dashboard-grid"
          layout={layout}
          width={width}
          gridConfig={{
            cols: 12,
            rowHeight: 100,
            margin: [12, 12],
            containerPadding: [12, 12],
          }}
          dragConfig={{
            enabled: editMode,
            handle: '.ant-card-head',
          }}
          resizeConfig={{ enabled: editMode }}
          onLayoutChange={handleLayoutChange}
        >
          {panels.map((panel) => (
            <div key={panel.id}>
              <PanelCard
                panel={panel}
                onDelete={editMode ? handleDeletePanel : undefined}
                onEdit={editMode ? onEditPanel : undefined}
              />
            </div>
          ))}
        </GridLayout>
      )}
    </div>
  );
}
