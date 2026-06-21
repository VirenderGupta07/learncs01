import { NavLink } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const STUDENT_LINKS = [
  { to: '/dashboard', label: 'My Courses' },
  { to: '/dashboard/orders', label: 'Order History' },
  { to: '/dashboard/certificates', label: 'Certificates' },
  { to: '/dashboard/profile', label: 'Profile' },
];

const INSTRUCTOR_LINKS = [
  { to: '/instructor', label: 'My Courses' },
  { to: '/instructor/students', label: 'Students' },
  { to: '/instructor/chat', label: 'Messages' },
];

// Each admin link is paired with the permission that unlocks it. Super Admin
// always sees everything; other admin-dashboard staff only see what they've
// been granted via Admin > Staff > Permissions.
const ADMIN_LINKS = [
  { to: '/admin', label: 'Overview', permission: null },
  { to: '/admin/courses', label: 'Courses', permission: 'manageCourses' },
  { to: '/admin/videos', label: 'Video Management', permission: 'manageVideos' },
  { to: '/admin/instructors', label: 'Instructors', permission: 'manageInstructors' },
  { to: '/admin/coupons', label: 'Coupons', permission: 'manageCoupons' },
  { to: '/admin/users', label: 'Users', permission: 'manageUsers' },
  { to: '/admin/staff', label: 'Staff & Permissions', permission: null, superAdminOnly: true },
  { to: '/admin/analytics', label: 'Analytics', permission: 'viewAnalytics' },
];

export default function Sidebar({ section }) {
  const { can, isSuperAdmin } = useAuth();

  const links =
    section === 'admin'
      ? ADMIN_LINKS.filter((l) => (l.superAdminOnly ? isSuperAdmin : !l.permission || can(l.permission)))
      : section === 'instructor'
      ? INSTRUCTOR_LINKS
      : STUDENT_LINKS;

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 px-4 py-6">
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end
            className={({ isActive }) =>
              `rounded-md px-3 py-2 text-sm ${isActive ? 'bg-gray-100 font-medium' : 'text-gray-600 hover:bg-gray-50'}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
