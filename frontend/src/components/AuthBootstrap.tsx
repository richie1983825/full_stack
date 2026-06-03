import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '../stores/useAuthStore';

export default function AuthBootstrap({ children }: { children: ReactNode }) {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) {
      void fetchMe();
    }
  }, [token, fetchMe]);

  return children;
}
