use crate::models::{MetricFieldMeta, NetworkMetric};

/// 字段格式，对应 Grafana field config
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FieldFormat {
    Plain,
    WithUnit,
    Change,
}

/// 与 SQL SELECT 展示字段顺序一致（见 metrics.rs）
#[derive(Debug, Clone)]
pub struct MetricFieldDef {
    pub name: &'static str,
    pub label: &'static str,
    pub field_type: &'static str,
    pub format: FieldFormat,
    pub merge_same: bool,
}

/// 与 metrics.rs SQL ORDER BY 一致
pub const DEFAULT_ORDER_BY: &[&str] = &["node_type", "metric_category", "metric_name"];

pub const DEFAULT_TABLE_FIELD_DEFS: &[MetricFieldDef] = &[
    MetricFieldDef {
        name: "node_type",
        label: "节点类型",
        field_type: "string",
        format: FieldFormat::Plain,
        merge_same: true,
    },
    MetricFieldDef {
        name: "metric_category",
        label: "指标类别",
        field_type: "string",
        format: FieldFormat::Plain,
        merge_same: false,
    },
    MetricFieldDef {
        name: "metric_name",
        label: "指标名称",
        field_type: "string",
        format: FieldFormat::Plain,
        merge_same: false,
    },
    MetricFieldDef {
        name: "current_value",
        label: "当前值",
        field_type: "number",
        format: FieldFormat::WithUnit,
        merge_same: false,
    },
    MetricFieldDef {
        name: "historical_peak",
        label: "历史峰值",
        field_type: "number",
        format: FieldFormat::WithUnit,
        merge_same: false,
    },
    MetricFieldDef {
        name: "mom_change",
        label: "环比",
        field_type: "number",
        format: FieldFormat::Change,
        merge_same: false,
    },
    MetricFieldDef {
        name: "yoy_change",
        label: "周同比",
        field_type: "number",
        format: FieldFormat::Change,
        merge_same: false,
    },
];

impl From<&MetricFieldDef> for MetricFieldMeta {
    fn from(def: &MetricFieldDef) -> Self {
        Self {
            name: def.name.to_string(),
            label: def.label.to_string(),
            field_type: def.field_type.to_string(),
            merge_same: def.merge_same.then_some(true),
            format: match def.format {
                FieldFormat::Plain => None,
                FieldFormat::WithUnit => Some("with_unit".into()),
                FieldFormat::Change => Some("change".into()),
            },
        }
    }
}

pub fn default_table_field_meta() -> Vec<MetricFieldMeta> {
    DEFAULT_TABLE_FIELD_DEFS
        .iter()
        .map(MetricFieldMeta::from)
        .collect()
}

pub fn resolve_table_fields(selected: Option<&[String]>) -> Vec<MetricFieldMeta> {
    let Some(names) = selected else {
        return default_table_field_meta();
    };
    if names.is_empty() {
        return default_table_field_meta();
    }

    let mut resolved = Vec::with_capacity(names.len());
    for name in names {
        if let Some(def) = DEFAULT_TABLE_FIELD_DEFS.iter().find(|d| d.name == name.as_str()) {
            resolved.push(MetricFieldMeta::from(def));
        }
    }

    if resolved.is_empty() {
        default_table_field_meta()
    } else {
        resolved
    }
}

pub fn format_field_value(metric: &NetworkMetric, def: &MetricFieldDef) -> String {
    match def.name {
        "node_type" => metric.node_type.clone(),
        "metric_category" => metric.metric_category.clone(),
        "metric_name" => metric.metric_name.clone(),
        "current_value" => format!("{}{}", metric.current_value, metric.unit),
        "historical_peak" => format!("{}{}", metric.historical_peak, metric.unit),
        "mom_change" => metric
            .mom_change
            .clone()
            .unwrap_or_else(|| "-".into()),
        "yoy_change" => metric
            .yoy_change
            .clone()
            .unwrap_or_else(|| "-".into()),
        other => other.to_string(),
    }
}

pub fn metric_field_value(metric: &NetworkMetric, field: &str) -> String {
    match field {
        "node_type" => metric.node_type.clone(),
        "metric_category" => metric.metric_category.clone(),
        "metric_name" => metric.metric_name.clone(),
        "current_value" => metric.current_value.clone(),
        "historical_peak" => metric.historical_peak.clone(),
        "mom_change" => metric.mom_change.clone().unwrap_or_else(|| "-".into()),
        "yoy_change" => metric.yoy_change.clone().unwrap_or_else(|| "-".into()),
        _ => String::new(),
    }
}

pub fn resolve_order_by(order_by: Option<&[String]>) -> Vec<String> {
    match order_by {
        Some(keys) if !keys.is_empty() => keys.to_vec(),
        _ => DEFAULT_ORDER_BY.iter().map(|s| (*s).to_string()).collect(),
    }
}

pub fn compare_by_fields(a: &NetworkMetric, b: &NetworkMetric, fields: &[String]) -> std::cmp::Ordering {
    for field in fields {
        let cmp = metric_field_value(a, field).cmp(&metric_field_value(b, field));
        if cmp != std::cmp::Ordering::Equal {
            return cmp;
        }
    }
    std::cmp::Ordering::Equal
}

pub fn sort_metrics_by_order(metrics: &mut [NetworkMetric], order_by: Option<&[String]>) {
    let keys = resolve_order_by(order_by);
    metrics.sort_by(|a, b| compare_by_fields(a, b, &keys));
}

pub fn sort_metrics(metrics: &mut [NetworkMetric]) {
    sort_metrics_by_order(metrics, None);
}

pub fn unique_in_order<'a>(
    metrics: &'a [NetworkMetric],
    field: &str,
    limit: Option<usize>,
) -> Vec<String> {
    let mut seen = std::collections::HashSet::new();
    let mut result = Vec::new();
    for metric in metrics {
        let value = metric_field_value(metric, field);
        if !seen.insert(value.clone()) {
            continue;
        }
        result.push(value);
        if limit.map(|n| result.len() >= n).unwrap_or(false) {
            break;
        }
    }
    result
}

pub fn format_metric_change(value: &str) -> String {
    if value.is_empty() || value == "-" {
        return "-".into();
    }
    if let Ok(parsed) = value.parse::<f64>() {
        if parsed > 0.0 {
            return format!("+{parsed}%");
        }
        return format!("{parsed}%");
    }
    value.to_string()
}
