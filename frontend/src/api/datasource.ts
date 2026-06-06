import { apiClient } from './client';
import { endpoints } from './endpoints';
import { normalizeColumnMetaList, normalizeTableMetaList } from '../utils/schemaLabel';
import type {
  CreateDataSourcePayload,
  ColumnMeta,
  DataSource,
  DataSourceQueryResult,
  TableMeta,
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

  /** Schema 探索：列出所有表（含 COMMENT） */
  listTables: async (id: string) => {
    const raw = await apiClient.get<TableMeta[] | string[]>(endpoints.datasourceTables(id));
    return normalizeTableMetaList(raw);
  },

  /** Schema 探索：列出指定表的列（含 COMMENT） */
  listColumns: async (id: string, table: string) => {
    const raw = await apiClient.get<ColumnMeta[]>(endpoints.datasourceColumns(id, table));
    return normalizeColumnMetaList(raw);
  },
};
