import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { registerSessionExpiredHandler } from '../utils/sessionExpired';

/** 在 Router 内注册 Session 过期后的 SPA 跳转 */
export default function SessionExpiredRedirect() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    registerSessionExpiredHandler(() => {
      logout();
      navigate('/login', { replace: true, state: { expired: true } });
    });
    return () => registerSessionExpiredHandler(null);
  }, [navigate, logout]);

  return null;
}
