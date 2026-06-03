/** 数据库类型图标 */
export default function DbTypeIcon({ type, size = 20 }: { type: string; size?: number }) {
  if (type === 'postgres' || type === 'postgresql') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <ellipse cx="12" cy="5" rx="11" ry="3" fill="#336791" />
        <path d="M23 5c0 1.657-4.925 3-11 3S1 6.657 1 5" stroke="#336791" strokeWidth="1.5" />
        <ellipse cx="12" cy="12" rx="11" ry="3" fill="#336791" />
        <path d="M23 12c0 1.657-4.925 3-11 3S1 13.657 1 12" stroke="#336791" strokeWidth="1.5" />
        <ellipse cx="12" cy="19" rx="11" ry="3" fill="#336791" />
        <path d="M1 5v14M23 5v14" stroke="#336791" strokeWidth="1.5" />
        <text x="12" y="19" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">PG</text>
      </svg>
    );
  }
  if (type === 'mysql') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <rect width="24" height="24" rx="4" fill="#4479A1" />
        <text x="12" y="17" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="sans-serif">MY</text>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="4" fill="#999" />
      <text x="12" y="17" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">DB</text>
    </svg>
  );
}
