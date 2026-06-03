import { apiClient } from './client';
import { endpoints } from './endpoints';
import type { NetworkMetricsFrame } from '../constants/networkMetricSchema';

// ============ 请求参数 ============

export interface NetworkMetricsParams {
  date: string;
}

export interface BusinessSystemsParams {
  id?: string;
}

export interface BusinessSystemPanel {
  id: string;
  title: string;
  type: string;
  description?: string;
  gridPos: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface BusinessSystemInfo {
  id: string;
  name: string;
  code: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  datasource_reference: {
    panels: BusinessSystemPanel[];
    datasource_type?: string;
    imported_at?: string;
    original_uid?: string;
  };
}

// ============ 响应类型 ============

export type { MetricFieldMeta, NetworkMetricsFrame } from '../constants/networkMetricSchema';

export interface NetworkMetric {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  node_type: string;
  metric_category: string;
  metric_name: string;
  unit: string;
  current_value: string;
  historical_peak: string;
  mom_change: string | null;
  yoy_change: string | null;
}

/** 容量管理平台 API */
export const cmpApi = {
  /** 获取网络指标数据（Grafana DataFrame 格式） */
  getNetworkMetrics: (params: NetworkMetricsParams) =>
    apiClient.post<NetworkMetricsFrame>(endpoints.networkMetrics, { params }),

  /** 获取业务系统模板数据 */
  getBusinessSystems: (params?: BusinessSystemsParams) =>
    apiClient.post<BusinessSystemInfo>(endpoints.businessSystems, { params }),
};
