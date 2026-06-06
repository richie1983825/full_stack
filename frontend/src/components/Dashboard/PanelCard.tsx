import { Card, Dropdown, Typography } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import type { PanelConfig } from '../../types/dashboard';
import ChartRenderer from '../Charts/ChartRenderer';

const { Text } = Typography;

interface PanelCardProps {
  panel: PanelConfig;
  onDelete?: (id: string) => void;
  onEdit?: (panel: PanelConfig) => void;
}

export default function PanelCard({ panel, onDelete, onEdit }: PanelCardProps) {
  const menuItems = [];
  if (onEdit) {
    menuItems.push({
      key: 'edit',
      label: '编辑组件',
      icon: <EditOutlined />,
      onClick: () => onEdit(panel),
    });
  }
  if (onEdit && onDelete) {
    menuItems.push({ type: 'divider' as const });
  }
  if (onDelete) {
    menuItems.push({
      key: 'delete',
      label: '删除组件',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => onDelete(panel.id),
    });
  }

  return (
    <Card
      size="small"
      title={
        <Text ellipsis style={{ maxWidth: 'calc(100% - 40px)' }}>
          {panel.title}
        </Text>
      }
      extra={
        onDelete || onEdit ? (
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <MoreOutlined style={{ cursor: 'pointer', fontSize: 16 }} />
          </Dropdown>
        ) : null
      }
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      className={panel.chartType === 'table' ? 'panel-card-table' : undefined}
      styles={{
        body: {
          flex: 1,
          minHeight: 0,
          padding: '8px 12px 8px 8px',
          overflow: 'hidden',
        },
        header: { minHeight: 38, padding: '0 12px' },
      }}
    >
      <ChartRenderer config={panel} />
    </Card>
  );
}
