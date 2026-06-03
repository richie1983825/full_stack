import { apiClient } from './client';
import { endpoints } from './endpoints';
import type {
  CreateDataSourcePayload,
  DataSource,
  DataSourceQueryResult,
  UpdateDataSourcePayload,
} from '../types';

/** 数据源相关 API */
export const datasourceApi = {
  list: () => apiClient.get<DataSource[]>(endpoints.datasources),

  getById: (id: string) => apiClient.get<DataSource>(endpoints.datasource(id)),

  create: (payload: CreateDataSourcePayload) =>
    apiClient.post<DataSource>(endpoints.datasources, payload),

  update: (id: string, payload: UpdateDataSourcePayload) =>
    apiClient.put<DataSource>(endpoints.datasource(id), payload),

  delete: (id: string) =>
    apiClient.delete<{ deleted: boolean }>(endpoints.datasource(id)),

  query: (id: string, sql: string) =>
    apiClient.post<DataSourceQueryResult>(endpoints.datasourceQuery(id), { sql }),

  /** Schema 探索：列出所有表 */
  listTables: (id: string) =>
    apiClient.get<string[]>(endpoints.datasourceTables(id)),

  /** Schema 探索：列出指定表的列 */
  listColumns: (id: string, table: string) =>
    apiClient.get<{ name: string; dataType: string }[]>(
      endpoints.datasourceColumns(id, table),
    ),
};
