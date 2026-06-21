import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import endpoints from '../../api/endpoints';

export default function CourseCatalog() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient
      .get(endpoints.courses.list)
      .then(({ data }) => setCourses(data.data.courses))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="px-6 py-12 text-center text-gray-500">Loading courses…</p>;

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="mb-8 text-2xl font-semibold">Courses</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <Link
            key={course._id}
            to={`/courses/${course.slug}`}
            className="rounded-lg border border-gray-200 p-4 transition hover:shadow-md"
          >
            <h2 className="font-medium">{course.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{course.category}</p>
            <p className="mt-3 font-semibold">${course.discountPrice ?? course.price}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
