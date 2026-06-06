import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AuthBootstrap from './components/AuthBootstrap';
import BackendGate from './components/BackendGate';
import SessionExpiredRedirect from './components/SessionExpiredRedirect';
import GrafanaLayout, { GuestRoute, ProtectedRoute } from './layouts/GrafanaLayout';
import DashboardListPage from './pages/DashboardListPage';
import DashboardEditorPage from './pages/DashboardEditorPage';
import DataSourcePage from './pages/DataSourcePage';
import LoginPage from './pages/LoginPage';
import PermissionsPage from './pages/admin/PermissionsPage';
import RolesPage from './pages/admin/RolesPage';
import UsersPage from './pages/admin/UsersPage';
import { useHomePageStore } from './stores/useHomePageStore';

function RedirectToHome() {
  const homePath = useHomePageStore((s) => s.getHomePath());
  return <Navigate to={homePath} replace />;
}

export default function AppRouter() {
  return (
    <BackendGate>
      <AuthBootstrap>
        <BrowserRouter>
          <SessionExpiredRedirect />
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<GrafanaLayout />}>
            <Route index element={<DashboardListPage />} />
            <Route path="/dashboards/:id" element={<DashboardEditorPage />} />
            <Route path="/datasources" element={<DataSourcePage />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/roles" element={<RolesPage />} />
            <Route path="/admin/permissions" element={<PermissionsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<RedirectToHome />} />
      </Routes>
        </BrowserRouter>
      </AuthBootstrap>
    </BackendGate>
  );
}
