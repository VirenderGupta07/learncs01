import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

/**
 * Usage:
 *   <Route element={<RoleRoute roles={['admin']} />}>
 *     <Route path="/admin/*" element={<AdminLayout />} />
 *   </Route>
 *
 * For permission-gated sub-sections (e.g. only admins with `manageVideos`),
 * pass `permission` as well - both checks must pass.
 */
export default function RoleRoute({ roles = [], permission }) {
  const { role, can } = useAuth();

  if (!roles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  if (permission && !can(permission)) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
