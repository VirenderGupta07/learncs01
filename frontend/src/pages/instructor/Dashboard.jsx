import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

export default function InstructorDashboard() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    // Instructors see their own courses regardless of publish state, so this
    // hits a slightly different filter than the public catalog endpoint.
    axiosClient.get('/courses?mine=true').then(({ data }) => setCourses(data.data.courses));
  }, []);

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Courses</h1>
        <Link to="/instructor/courses/new" className="rounded-md bg-ink px-4 py-2 text-sm text-white">
          New course
        </Link>
      </div>
      <ul className="space-y-3">
        {courses.map((course) => (
          <li key={course._id} className="flex items-center justify-between rounded-md border border-gray-200 p-4">
            <div>
              <p className="font-medium">{course.title}</p>
              <p className="text-xs text-gray-500">{course.isPublished ? 'Published' : 'Draft'}</p>
            </div>
            <Link to={`/instructor/courses/${course._id}`} className="text-sm underline">
              Edit
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
