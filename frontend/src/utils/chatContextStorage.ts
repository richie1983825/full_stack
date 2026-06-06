const DATASOURCE_KEY = 'cmp-chat-datasource';

export function getLastDatasourceId(): string | null {
  try {
    return sessionStorage.getItem(DATASOURCE_KEY);
  } catch {
    return null;
  }
}

export function setLastDatasourceId(id: string) {
  try {
    sessionStorage.setItem(DATASOURCE_KEY, id);
  } catch {
    // ignore
  }
}
