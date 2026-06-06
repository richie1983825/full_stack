import { CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons';

interface TableExpandArrowProps<T> {
  expanded: boolean;
  expandable: boolean;
  record: T;
  onExpand: (record: T, event: React.MouseEvent<HTMLElement>) => void;
}

/** Ant Design Table expandable.expandIcon，风格与仪表盘文件夹箭头一致 */
export default function TableExpandArrow<T>({
  expanded,
  expandable,
  record,
  onExpand,
}: TableExpandArrowProps<T>) {
  if (!expandable) {
    return <span className="table-expand-arrow-placeholder" aria-hidden />;
  }

  return (
    <button
      type="button"
      className="dashboard-folder-arrow-btn"
      aria-label={expanded ? '收起' : '展开'}
      aria-expanded={expanded}
      onClick={(e) => onExpand(record, e)}
    >
      {expanded ? <CaretUpOutlined /> : <CaretDownOutlined />}
    </button>
  );
}
