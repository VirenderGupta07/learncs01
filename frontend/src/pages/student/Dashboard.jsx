import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import endpoints from '../../api/endpoints';

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    axiosClient.get(endpoints.auth.me).then(({ data }) => setUser(data.data.user));
  }, []);

  if (!user) return null;

  return (
    <section>
      <h1 className="mb-6 text-xl font-semibold">My Courses</h1>
      <ul className="space-y-3">
        {user.purchasedCourses.map((entry) => (
          <li key={entry.course} className="rounded-md border border-gray-200 p-4">
            <Link to={`/dashboard/courses/${entry.course}`} className="font-medium">
              Continue learning
            </Link>
            <p className="text-xs text-gray-500">Purchased {new Date(entry.purchasedAt).toLocaleDateString()}</p>
          </li>
        ))}
        {user.purchasedCourses.length === 0 && (
          <p className="text-sm text-gray-500">
            No courses yet. <Link to="/courses" className="underline">Browse the catalog</Link>.
          </p>
        )}
      </ul>
    </section>
  );
}
