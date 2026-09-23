import { Spin } from 'antd';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { status } = useAuth();
  if (status === 'loading') return <div className="auth-loading"><Spin size="large" /></div>;
  if (status === 'unauthenticated') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
