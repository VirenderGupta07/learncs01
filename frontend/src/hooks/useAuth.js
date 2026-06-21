import { useSelector } from 'react-redux';

export default function useAuth() {
  const { user, bootstrapped, status } = useSelector((state) => state.auth);

  return {
    user,
    isAuthenticated: !!user,
    isLoading: !bootstrapped || status === 'loading',
    role: user?.role,
    isSuperAdmin: !!user?.isSuperAdmin,
    can: (permissionKey) => user?.role === 'admin' && (user.isSuperAdmin || user.permissions?.[permissionKey] === true),
  };
}
