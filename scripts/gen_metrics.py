#!/usr/bin/env python3
"""
网络指标数据生成脚本
从指定日期复制数据到目标日期，对数值字段做小幅随机波动。

用法:
  python3 gen_metrics.py                          # 默认：从 2026-05-13 生成到昨天
  python3 gen_metrics.py --from 2026-05-13 --to 2026-06-03
  python3 gen_metrics.py --from 2026-05-13         # 生成到昨天
"""

import argparse
import os
import random
import sys
import uuid
from datetime import date, datetime, timedelta

import psycopg2
from psycopg2.extras import execute_values

# ---- 配置 ----
DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgres://postgres:postgres123@localhost:5432/cmp_service",
)

TABLE = "net_work_metrics"
# 需要波动的数值列
NUMERIC_COLS = ["current_value", "historical_peak", "wow_change", "dod_change"]
# 波动范围（± 这个比例）
FLUCTUATION = 0.03  # 3%


def parse_db_url(url: str):
    """postgres://user:pass@host:port/db -> dict"""
    without = url.replace("postgres://", "")
    userinfo, rest = without.split("@")
    user, _, password = userinfo.partition(":")
    host_port, _, dbname = rest.partition("/")
    host, _, port = host_port.partition(":")
    return {
        "host": host,
        "port": int(port) if port else 5432,
        "dbname": dbname,
        "user": user,
        "password": password,
    }


def fluctuate(value_str: str) -> str:
    """对数值字符串做 ±3% 随机波动"""
    try:
        v = float(value_str)
    except (ValueError, TypeError):
        return value_str  # 非数字保持不变
    delta = v * FLUCTUATION * (random.random() * 2 - 1)  # -3% ~ +3%
    new_v = v + delta
    # 保留最多 3 位小数，去掉尾部 0
    return f"{new_v:.3f}".rstrip("0").rstrip(".")


def generate(conn, from_date: str, to_date: str):
    """从 from_date 复制数据到 to_date"""
    cur = conn.cursor()

    # 1. 读取源数据
    cur.execute(
        f"SELECT * FROM {TABLE} WHERE created_at::date = %s ORDER BY id",
        (from_date,),
    )
    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    print(f"源日期 {from_date}: {len(rows)} 条记录")

    if not rows:
        print("无源数据，退出。")
        return

    # 2. 检查目标日期是否已有数据
    cur.execute(
        f"SELECT COUNT(*) FROM {TABLE} WHERE created_at::date = %s",
        (to_date,),
    )
    existing = cur.fetchone()[0]
    if existing > 0:
        print(f"目标日期 {to_date} 已有 {existing} 条记录，跳过（如需覆盖请先手动删除）。")
        return

    # 3. 生成新行
    new_rows = []
    for row in rows:
        record = dict(zip(columns, row))
        # 生成新 ID（雪花 ID 风格，也可用 UUID）
        new_id = str(uuid.uuid4().int)[:19]
        record["id"] = new_id
        # 设置为目标日期 00:00:00
        record["created_at"] = f"{to_date} 00:00:00"
        record["updated_at"] = None
        # 对数值列做波动
        for col in NUMERIC_COLS:
            if record.get(col):
                record[col] = fluctuate(record[col])
        new_rows.append(tuple(record[c] for c in columns))

    # 4. 批量插入
    sql = f'INSERT INTO {TABLE} ({", ".join(columns)}) VALUES %s'
    execute_values(cur, sql, new_rows, page_size=200)
    conn.commit()
    cur.close()
    print(f"已生成 {to_date}: {len(new_rows)} 条记录 ✅")


def main():
    parser = argparse.ArgumentParser(description="网络指标数据生成脚本")
    parser.add_argument("--from", dest="from_date", default="2026-05-13", help="源日期 (YYYY-MM-DD)")
    parser.add_argument("--to", dest="to_date", default=None, help="目标日期 (YYYY-MM-DD)，默认昨天")
    parser.add_argument("--fluctuation", type=float, default=0.03, help="波动比例，默认 0.03 (3%%)")
    args = parser.parse_args()

    global FLUCTUATION
    FLUCTUATION = getattr(args, "fluctuation", 0.03)
    from_date = getattr(args, "from_date")
    to_date = args.to_date or (date.today() - timedelta(days=1)).isoformat()

    cfg = parse_db_url(DB_URL)
    conn = psycopg2.connect(**cfg)
    try:
        generate(conn, from_date, to_date)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
