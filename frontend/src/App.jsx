import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';
import { fetchCurrentUser, logout } from './features/auth/authSlice';

import Home from './pages/public/Home';
import CourseCatalog from './pages/public/CourseCatalog';
import CourseDetail from './pages/public/CourseDetail';
import Login from './pages/public/Login';
import Register from './pages/public/Register';

import StudentDashboard from './pages/student/Dashboard';
import CoursePlayer from './pages/student/CoursePlayer';
import QuizAttempt from './pages/student/QuizAttempt';
import OrderHistory from './pages/student/OrderHistory';
import Profile from './pages/student/Profile';

import InstructorDashboard from './pages/instructor/Dashboard';
import CourseEditor from './pages/instructor/CourseEditor';

import AdminDashboard from './pages/admin/Dashboard';
import VideoManager from './pages/admin/VideoManager';
import StaffPermissions from './pages/admin/StaffPermissions';
import CouponManager from './pages/admin/CouponManager';
import InstructorManager from './pages/admin/InstructorManager';

function DashboardLayout({ section, children }) {
  return (
    <div className="mx-auto flex max-w-6xl">
      <Sidebar section={section} />
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchCurrentUser());

    function handleUnauthorized() {
      dispatch(logout());
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [dispatch]);

  return (
    <div>
      <Navbar />

      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/courses" element={<CourseCatalog />} />
        <Route path="/courses/:slug" element={<CourseDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Authenticated */}
        <Route element={<ProtectedRoute />}>
          {/* Student */}
          <Route element={<RoleRoute roles={['student']} />}>
            <Route
              path="/dashboard"
              element={
                <DashboardLayout section="student">
                  <StudentDashboard />
                </DashboardLayout>
              }
            />
            <Route
              path="/dashboard/orders"
              element={
                <DashboardLayout section="student">
                  <OrderHistory />
                </DashboardLayout>
              }
            />
            <Route
              path="/dashboard/profile"
              element={
                <DashboardLayout section="student">
                  <Profile />
                </DashboardLayout>
              }
            />
            <Route path="/dashboard/courses/:courseId" element={<CoursePlayer />} />
            <Route path="/dashboard/courses/:courseId/quiz" element={<QuizAttempt />} />
          </Route>

          {/* Instructor */}
          <Route element={<RoleRoute roles={['instructor']} />}>
            <Route
              path="/instructor"
              element={
                <DashboardLayout section="instructor">
                  <InstructorDashboard />
                </DashboardLayout>
              }
            />
            <Route
              path="/instructor/courses/:courseId"
              element={
                <DashboardLayout section="instructor">
                  <CourseEditor />
                </DashboardLayout>
              }
            />
          </Route>

          {/* Admin */}
          <Route element={<RoleRoute roles={['admin']} />}>
            <Route
              path="/admin"
              element={
                <DashboardLayout section="admin">
                  <AdminDashboard />
                </DashboardLayout>
              }
            />
            <Route
              path="/admin/videos"
              element={
                <DashboardLayout section="admin">
                  <VideoManager />
                </DashboardLayout>
              }
            />
            <Route
              path="/admin/staff"
              element={
                <DashboardLayout section="admin">
                  <StaffPermissions />
                </DashboardLayout>
              }
            />
            <Route
              path="/admin/coupons"
              element={
                <DashboardLayout section="admin">
                  <CouponManager />
                </DashboardLayout>
              }
            />
            <Route
              path="/admin/instructors"
              element={
                <DashboardLayout section="admin">
                  <InstructorManager />
                </DashboardLayout>
              }
            />
          </Route>
        </Route>
      </Routes>
    </div>
  );
}
