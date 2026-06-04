use serde_json::Value;

use crate::models::MetricFieldMeta;
use crate::services::metric_schema::{default_table_field_meta, format_metric_change};

pub fn render_snapshot_html(
    title: &str,
    variables: &Value,
    panels: &Value,
    generated_at: &str,
) -> String {
    let date = variables
        .get("date")
        .and_then(|v| v.as_str())
        .unwrap_or("-");

    let mut panel_blocks = String::new();
    let mut chart_scripts = String::new();
    let mut chart_index = 0usize;

    if let Some(items) = panels.as_array() {
        for panel in items {
            let panel_title = panel
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("Panel");
            let chart_type = panel
                .get("chartType")
                .and_then(|v| v.as_str())
                .unwrap_or("line");
            let grid = panel.get("grid").cloned().unwrap_or_else(|| {
                serde_json::json!({ "x": 0, "y": 0, "w": 12, "h": 3 })
            });
            let x = grid.get("x").and_then(|v| v.as_u64()).unwrap_or(0) + 1;
            let y = grid.get("y").and_then(|v| v.as_u64()).unwrap_or(0) + 1;
            let w = grid.get("w").and_then(|v| v.as_u64()).unwrap_or(12);
            let h = grid.get("h").and_then(|v| v.as_u64()).unwrap_or(3);

            if chart_type == "table" {
                let table_html = render_table_html(panel);
                panel_blocks.push_str(&format!(
                    r#"<section class="panel" style="grid-column:{x} / span {w}; grid-row:{y} / span {h};">
  <header class="panel-title">{panel_title}</header>
  <div class="panel-body">{table_html}</div>
</section>"#,
                ));
            } else {
                let chart_id = format!("chart-{chart_index}");
                chart_index += 1;
                let option_json = panel.get("option").cloned().unwrap_or_else(|| Value::Null);
                let option_str = serde_json::to_string(&option_json).unwrap_or_else(|_| "{}".into());

                panel_blocks.push_str(&format!(
                    r#"<section class="panel" style="grid-column:{x} / span {w}; grid-row:{y} / span {h};">
  <header class="panel-title">{panel_title}</header>
  <div class="panel-body"><div id="{chart_id}" class="chart"></div></div>
</section>"#,
                ));

                chart_scripts.push_str(&format!(
                    r#"
(function() {{
  var el = document.getElementById("{chart_id}");
  if (!el || typeof echarts === "undefined") return;
  var chart = echarts.init(el);
  var option = {option_str};
  if (option.legend) option.legend = Object.assign({{ top: 8, right: 8, left: "auto", orient: "horizontal", type: "scroll", padding: [4, 8, 4, 8] }}, option.legend);
  if (option.legend && option.legend.bottom != null) {{
    delete option.legend.top;
    delete option.legend.right;
    option.legend.left = option.legend.left || "center";
    option.legend.bottom = Math.max(option.legend.bottom || 0, 8);
  }}
  if (option.legend && option.legend.bottom == null) {{ delete option.legend.bottom; delete option.legend.width; }}
  if (!option.grid) option.grid = {{
    left: 50,
    right: 24,
    top: option.legend && option.legend.bottom == null ? 44 : 20,
    bottom: option.legend && option.legend.bottom != null ? 52 : 30
  }};
  else option.grid.right = Math.max(option.grid.right || 24, 16);
  chart.setOption(option);
  window.addEventListener("resize", function() {{ chart.resize(); }});
}})();
"#,
                ));
            }
        }
    }

    format!(
        r#"<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} - 快照</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js"></script>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: #f0f6fc; color: #1f1f1f; }}
    .snapshot-header {{ background: linear-gradient(180deg, #1d4570 0%, #0f2847 100%); color: #fff; padding: 16px 24px; }}
    .snapshot-header h1 {{ font-size: 20px; margin-bottom: 6px; }}
    .snapshot-meta {{ font-size: 13px; opacity: 0.85; }}
    .snapshot-badge {{ display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 4px; background: rgba(255,255,255,0.15); font-size: 12px; }}
    .dashboard-grid {{ display: grid; grid-template-columns: repeat(12, 1fr); gap: 12px; padding: 16px; max-width: 1440px; margin: 0 auto; }}
    .panel {{ background: #fff; border: 1px solid #e8e8e8; border-radius: 6px; overflow: hidden; min-height: 120px; display: flex; flex-direction: column; }}
    .panel-title {{ padding: 8px 12px; font-weight: 600; font-size: 14px; border-bottom: 1px solid #f0f0f0; }}
    .panel-body {{ flex: 1; padding: 8px; min-height: 0; }}
    .chart {{ width: 100%; height: 100%; min-height: 240px; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
    th, td {{ border-bottom: 1px solid #f0f0f0; padding: 8px 10px; text-align: left; }}
    th {{ background: #fafafa; font-weight: 600; }}
    tr:hover td {{ background: #fafafa; }}
    .snapshot-footer {{ text-align: center; color: #999; font-size: 12px; padding: 24px; }}
  </style>
</head>
<body>
  <header class="snapshot-header">
    <h1>{title}<span class="snapshot-badge">静态快照</span></h1>
    <div class="snapshot-meta">数据日期：{date} · 生成时间：{generated_at}</div>
  </header>
  <main class="dashboard-grid">
    {panel_blocks}
  </main>
  <footer class="snapshot-footer">容量管理平台 · 仪表盘快照（数据已嵌入，无需登录即可查看）</footer>
  <script>{chart_scripts}</script>
</body>
</html>"#
    )
}

fn render_table_html(panel: &Value) -> String {
    let option = panel.get("option");
    let data = option
        .and_then(|o| o.get("data"))
        .and_then(|d| d.as_array());

    let Some(rows) = data else {
        return r#"<p style="color:#999;padding:16px;">暂无数据</p>"#.into();
    };

    if rows.is_empty() {
        return r#"<p style="color:#999;padding:16px;">暂无数据</p>"#.into();
    }

    let fields = parse_table_fields(option);
    let merge_field = fields.iter().find(|field| field.merge_same == Some(true));

    let mut html = String::from("<table><thead><tr>");
    for field in &fields {
        html.push_str(&format!("<th>{}</th>", field.label));
    }
    html.push_str("</tr></thead><tbody>");

    let merge_spans = merge_field
        .map(|field| compute_merge_row_spans(rows, &field.name))
        .unwrap_or_else(|| vec![1; rows.len()]);

    for (row_index, row) in rows.iter().enumerate() {
        html.push_str("<tr>");
        for field in &fields {
            let is_merge_col = merge_field.is_some_and(|f| f.name == field.name);
            if is_merge_col && merge_spans[row_index] == 0 {
                continue;
            }

            let cell = format_table_cell(row, field);
            if is_merge_col && merge_spans[row_index] > 1 {
                html.push_str(&format!(
                    r#"<td rowspan="{}" style="vertical-align:middle;">{cell}</td>"#,
                    merge_spans[row_index]
                ));
            } else {
                html.push_str(&format!("<td>{cell}</td>"));
            }
        }
        html.push_str("</tr>");
    }

    html.push_str("</tbody></table>");
    html
}

fn parse_table_fields(option: Option<&Value>) -> Vec<MetricFieldMeta> {
    option
        .and_then(|o| o.get("fields"))
        .and_then(|f| f.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|item| {
                    Some(MetricFieldMeta {
                        name: item.get("name")?.as_str()?.to_string(),
                        label: item.get("label")?.as_str()?.to_string(),
                        field_type: item
                            .get("type")
                            .and_then(|v| v.as_str())
                            .unwrap_or("string")
                            .to_string(),
                        merge_same: item.get("mergeSame").and_then(|v| v.as_bool()),
                        format: item
                            .get("format")
                            .and_then(|v| v.as_str())
                            .map(String::from),
                    })
                })
                .collect()
        })
        .filter(|items: &Vec<MetricFieldMeta>| !items.is_empty())
        .unwrap_or_else(default_table_field_meta)
}

fn compute_merge_row_spans(rows: &[Value], field_name: &str) -> Vec<usize> {
    let mut spans = vec![1; rows.len()];
    let mut index = 0;

    while index < rows.len() {
        let current = cell_string(&rows[index], field_name);
        let mut next = index + 1;
        while next < rows.len() && cell_string(&rows[next], field_name) == current {
            next += 1;
        }
        spans[index] = next - index;
        for i in (index + 1)..next {
            spans[i] = 0;
        }
        index = next;
    }

    spans
}

fn cell_string(row: &Value, field_name: &str) -> String {
    row.get(field_name)
        .map(|v| match v {
            Value::String(s) => s.clone(),
            Value::Number(n) => n.to_string(),
            Value::Bool(b) => b.to_string(),
            _ => v.to_string(),
        })
        .unwrap_or_else(|| "-".into())
}

fn format_table_cell(row: &Value, field: &MetricFieldMeta) -> String {
    let raw = cell_string(row, &field.name);
    if field.format.as_deref() == Some("change") {
        return format_metric_change(&raw);
    }
    raw
}
