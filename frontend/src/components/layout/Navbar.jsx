import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function Navbar() {
  const { isAuthenticated, role, user } = useAuth();

  return (
    <header className="border-b border-gray-200">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          LearnCS01
        </Link>

        <div className="flex items-center gap-6 text-sm">
          <Link to="/courses">Courses</Link>

          {isAuthenticated ? (
            <>
              {role === 'student' && <Link to="/cart">Cart</Link>}
              {role === 'student' && <Link to="/dashboard">My Learning</Link>}
              {role === 'instructor' && <Link to="/instructor">Instructor Studio</Link>}
              {role === 'admin' && <Link to="/admin">Admin</Link>}
              <span className="text-gray-500">{user?.name}</span>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register" className="rounded-md bg-ink px-3 py-1.5 text-white">
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
