import { Navigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';

const ProtectedRoute = ({ children, roles = [] }) => {
  const { token, user } = useAuthStore();

  // 如果没有token，重定向到登录页
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 如果需要特定角色但用户角色不匹配，重定向到首页
  if (roles.length > 0 && user) {
    const userRole = user.role || 'user';
    if (!roles.includes(userRole)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;

