import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import endpoints from '../../api/endpoints';
import VideoPlayer from '../../components/player/VideoPlayer';

export default function CoursePlayer() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [activeLecture, setActiveLecture] = useState(null);

  useEffect(() => {
    axiosClient.get(`/courses/by-id/${courseId}`).then(({ data }) => {
      setCourse(data.data.course);
      setActiveLecture(data.data.course.modules?.[0]?.lectures?.[0] ?? null);
    });
  }, [courseId]);

  if (!course) return null;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        {activeLecture && <VideoPlayer lecture={activeLecture} />}
        <h1 className="mt-4 text-xl font-semibold">{activeLecture?.title}</h1>
        <p className="mt-2 text-sm text-gray-600">{activeLecture?.description}</p>

        <a
          href={`/dashboard/courses/${courseId}/quiz`}
          className="mt-6 inline-block rounded-md bg-ink px-4 py-2 text-sm text-white"
        >
          Take the final quiz
        </a>
      </div>

      <aside className="space-y-6">
        {course.modules.map((courseModule) => (
          <div key={courseModule._id}>
            <h3 className="text-sm font-medium text-gray-500">{courseModule.title}</h3>
            <ul className="mt-2 space-y-1">
              {courseModule.lectures.map((lecture) => (
                <li key={lecture._id}>
                  <button
                    onClick={() => setActiveLecture(lecture)}
                    className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                      activeLecture?._id === lecture._id ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
                    }`}
                  >
                    {lecture.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>
    </div>
  );
}
