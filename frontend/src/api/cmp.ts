import { apiClient } from './client';
import { endpoints } from './endpoints';

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

export type { MetricFieldMeta } from '../constants/metricFieldMeta';

/** 容量管理平台 API（遗留业务系统模板） */
export const cmpApi = {
  getBusinessSystems: (params?: BusinessSystemsParams) =>
    apiClient.post<BusinessSystemInfo>(endpoints.businessSystems, { params }),
};
