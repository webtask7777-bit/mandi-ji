import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { safeReturnTo } from '../../utils/safeReturnTo';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const returnTo = safeReturnTo(`${location.pathname}${location.search}${location.hash}`);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground animate-pulse">लोड हो रहा है...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ returnTo }} replace />;
  return children;
}
