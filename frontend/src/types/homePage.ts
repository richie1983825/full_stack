export type HomePageTarget =
  | { type: 'dashboard-list' }
  | { type: 'dashboard'; id: string; title: string };
