use serde_json::{json, Value};

use crate::models::NetworkMetric;
use crate::services::metric_schema::{
    compare_by_fields, format_field_value, metric_field_value, resolve_order_by,
    resolve_table_fields, sort_metrics_by_order, unique_in_order, DEFAULT_TABLE_FIELD_DEFS,
    MetricFieldDef,
};

const COLOR_PRIMARY: &str = "#2563ab";

/// 与前端 `Number.parseFloat` 一致：解析数值前缀，忽略 `%` 等后缀
fn parse_value(value: &str) -> f64 {
    let trimmed = value.trim();
    if let Ok(v) = trimmed.parse::<f64>() {
        return v;
    }
    for end in (1..=trimmed.len()).rev() {
        if let Ok(v) = trimmed[..end].parse::<f64>() {
            return v;
        }
    }
    0.0
}

fn field_def_by_name(name: &str) -> Option<&'static MetricFieldDef> {
    DEFAULT_TABLE_FIELD_DEFS.iter().find(|def| def.name == name)
}

pub fn build_table_option(
    metrics: &[NetworkMetric],
    selected_fields: Option<&[String]>,
    order_by: Option<&[String]>,
) -> Value {
    let mut sorted = metrics.to_vec();
    sort_metrics_by_order(&mut sorted, order_by);
    let resolved_order = resolve_order_by(order_by);

    let fields = resolve_table_fields(selected_fields);
    let data: Vec<Value> = sorted
        .iter()
        .map(|item| {
            let mut row = serde_json::Map::new();
            for meta in &fields {
                if let Some(def) = field_def_by_name(&meta.name) {
                    row.insert(
                        meta.name.clone(),
                        json!(format_field_value(item, def)),
                    );
                }
            }
            Value::Object(row)
        })
        .collect();

    json!({
        "fields": fields,
        "data": data,
        "orderBy": resolved_order,
    })
}

pub fn build_bar_option(
    metrics: &[NetworkMetric],
    limit: usize,
    value_field: &str,
    order_by: Option<&[String]>,
) -> Value {
    let order_keys = resolve_order_by(order_by);
    let mut sorted = metrics.to_vec();
    sort_metrics_by_order(&mut sorted, order_by);

    sorted.sort_by(|a, b| {
        parse_value(&metric_field_value(b, value_field))
            .partial_cmp(&parse_value(&metric_field_value(a, value_field)))
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| compare_by_fields(a, b, &order_keys))
    });
    let top: Vec<&NetworkMetric> = sorted.iter().take(limit).collect();

    json!({
        "tooltip": { "trigger": "axis" },
        "grid": { "left": 120, "right": 20, "top": 20, "bottom": 30 },
        "xAxis": { "type": "value" },
        "yAxis": {
            "type": "category",
            "data": top.iter().map(|m| m.metric_name.clone()).collect::<Vec<_>>(),
            "axisLabel": { "width": 100, "overflow": "truncate" }
        },
        "series": [{
            "type": "bar",
            "data": top.iter().map(|m| parse_value(&metric_field_value(m, value_field))).collect::<Vec<_>>(),
            "itemStyle": { "color": COLOR_PRIMARY }
        }]
    })
}

pub fn build_line_option(
    metrics: &[NetworkMetric],
    series_field: &str,
    category_field: &str,
    value_field: &str,
    order_by: Option<&[String]>,
) -> Value {
    use std::collections::{HashMap, HashSet};

    let mut sorted = metrics.to_vec();
    sort_metrics_by_order(&mut sorted, order_by);

    let group_keys = unique_in_order(&sorted, series_field, Some(5));
    let group_key_set: HashSet<String> = group_keys.iter().cloned().collect();
    let scoped: Vec<NetworkMetric> = sorted
        .iter()
        .filter(|item| group_key_set.contains(&metric_field_value(item, series_field)))
        .cloned()
        .collect();
    let categories = unique_in_order(&scoped, category_field, Some(8));

    let series: Vec<Value> = group_keys
        .into_iter()
        .map(|name| {
            let value_map: HashMap<String, f64> = sorted
                .iter()
                .filter(|item| metric_field_value(item, series_field) == name)
                .map(|item| {
                    (
                        metric_field_value(item, category_field),
                        parse_value(&metric_field_value(item, value_field)),
                    )
                })
                .collect();
            json!({
                "name": name,
                "type": "line",
                "smooth": true,
                "data": categories
                    .iter()
                    .map(|cat| value_map.get(cat).copied().unwrap_or(0.0))
                    .collect::<Vec<_>>()
            })
        })
        .collect();

    json!({
        "tooltip": { "trigger": "axis" },
        "legend": { "bottom": 0 },
        "xAxis": { "type": "category", "data": categories },
        "yAxis": { "type": "value" },
        "series": series
    })
}

fn panel_query_source(panel: &Value) -> Option<&str> {
    panel
        .get("query")
        .and_then(|q| q.get("source"))
        .and_then(|s| s.as_str())
}

fn panel_chart_type(panel: &Value) -> &str {
    panel
        .get("chartType")
        .and_then(|v| v.as_str())
        .unwrap_or("line")
}

fn panel_query_fields(panel: &Value) -> Option<Vec<String>> {
    panel
        .get("query")
        .and_then(|q| q.get("fields"))
        .and_then(|f| f.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .filter(|items: &Vec<String>| !items.is_empty())
}

fn panel_query_order_by(panel: &Value) -> Option<Vec<String>> {
    panel
        .get("query")
        .and_then(|q| q.get("orderBy"))
        .and_then(|f| f.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .filter(|items: &Vec<String>| !items.is_empty())
}

fn panel_query_string(panel: &Value, key: &str, default: &str) -> String {
    panel
        .get("query")
        .and_then(|q| q.get(key))
        .and_then(|v| v.as_str())
        .unwrap_or(default)
        .to_string()
}

/// 将面板数据嵌入 option，并移除 query（Grafana snapshot 风格）
pub fn hydrate_panels_for_snapshot(panels: &Value, metrics: &[NetworkMetric]) -> Value {
    let Some(items) = panels.as_array() else {
        return json!([]);
    };

    let hydrated: Vec<Value> = items
        .iter()
        .map(|panel| {
            let mut out = panel.clone();
            if let Some(obj) = out.as_object_mut() {
                obj.remove("query");
            }

            if panel_query_source(panel) != Some("network_metrics") {
                return out;
            }

            let limit = panel
                .get("query")
                .and_then(|q| q.get("limit"))
                .and_then(|v| v.as_u64())
                .unwrap_or(10) as usize;
            let order_by = panel_query_order_by(panel);
            let selected_fields = panel_query_fields(panel);
            let value_field = panel_query_string(panel, "valueField", "current_value");
            let group_by = panel_query_string(panel, "groupBy", "node_type");
            let category_field = panel_query_string(panel, "categoryField", "metric_name");

            let option = match panel_chart_type(panel) {
                "table" => build_table_option(
                    metrics,
                    selected_fields.as_deref(),
                    order_by.as_deref(),
                ),
                "bar" => build_bar_option(
                    metrics,
                    limit,
                    &value_field,
                    order_by.as_deref(),
                ),
                _ => build_line_option(
                    metrics,
                    &group_by,
                    &category_field,
                    &value_field,
                    order_by.as_deref(),
                ),
            };

            if let Some(obj) = out.as_object_mut() {
                obj.insert("option".into(), option);
            }
            out
        })
        .collect();

    json!(hydrated)
}

pub fn resolve_snapshot_date(variables: &Value, date_mode: &str) -> String {
    use chrono::{Duration, Local};

    match date_mode {
        "today" => Local::now().date_naive().format("%Y-%m-%d").to_string(),
        "yesterday" => (Local::now().date_naive() - Duration::days(1))
            .format("%Y-%m-%d")
            .to_string(),
        _ => variables
            .get("date")
            .and_then(|v| v.as_str())
            .unwrap_or("2026-05-13")
            .to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::metric_schema::default_table_field_meta;

    fn sample_metric(node: &str, category: &str, name: &str, value: &str) -> NetworkMetric {
        NetworkMetric {
            id: "1".into(),
            created_at: None,
            updated_at: None,
            node_type: node.into(),
            metric_category: category.into(),
            metric_name: name.into(),
            unit: "%".into(),
            current_value: value.into(),
            historical_peak: "20".into(),
            mom_change: Some("1".into()),
            yoy_change: None,
        }
    }

    #[test]
    fn parses_value_with_unit_suffix() {
        assert_eq!(parse_value("65.3%"), 65.3);
        assert_eq!(parse_value("82.5"), 82.5);
        assert_eq!(parse_value("invalid"), 0.0);
    }

    #[test]
    fn builds_table_option_with_grafana_fields() {
        let opt = build_table_option(&[sample_metric("DCI", "usage", "link-a", "10")], None, None);
        assert!(opt.get("data").unwrap().as_array().unwrap().len() == 1);
        let fields = opt.get("fields").unwrap().as_array().unwrap();
        assert_eq!(fields.len(), default_table_field_meta().len());
        assert_eq!(fields[0].get("name").unwrap().as_str().unwrap(), "node_type");
    }

    #[test]
    fn line_option_uses_sql_order_for_series_and_categories() {
        let metrics = vec![
            sample_metric("B节点", "cat", "指标-2", "2"),
            sample_metric("A节点", "cat", "指标-1", "1"),
            sample_metric("A节点", "cat", "指标-2", "3"),
        ];
        let opt = build_line_option(&metrics, "node_type", "metric_name", "current_value", None);
        let x_axis = opt.get("xAxis").unwrap().get("data").unwrap().as_array().unwrap();
        assert_eq!(x_axis[0].as_str().unwrap(), "指标-1");
        let series = opt.get("series").unwrap().as_array().unwrap();
        assert_eq!(series[0].get("name").unwrap().as_str().unwrap(), "A节点");
    }
}
