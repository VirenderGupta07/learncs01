import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

export default function CourseEditor() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [newLectureTitle, setNewLectureTitle] = useState({});

  useEffect(() => {
    if (courseId === 'new') return;
    axiosClient.get(`/courses/by-id/${courseId}`).then(({ data }) => setCourse(data.data.course));
  }, [courseId]);

  async function addLecture(moduleId) {
    const title = newLectureTitle[moduleId];
    if (!title) return;
    const { data } = await axiosClient.post(`/courses/${course._id}/modules/${moduleId}/lectures`, { title });
    setCourse(data.data.course);
    setNewLectureTitle((prev) => ({ ...prev, [moduleId]: '' }));
  }

  if (!course) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <section>
      <h1 className="text-xl font-semibold">{course.title}</h1>

      <div className="mt-8 space-y-8">
        {course.modules.map((courseModule) => (
          <div key={courseModule._id} className="rounded-md border border-gray-200 p-4">
            <h2 className="font-medium">{courseModule.title}</h2>
            <ul className="mt-3 space-y-2">
              {courseModule.lectures.map((lecture) => (
                <li key={lecture._id} className="flex items-center justify-between text-sm">
                  <span>{lecture.title}</span>
                  <span className="text-xs text-gray-400">
                    {lecture.videoSource === 'youtube' && lecture.youtubeVideoId
                      ? 'YouTube attached'
                      : lecture.videoSource === 's3' && lecture.s3?.status === 'ready'
                      ? 'S3 video attached'
                      : 'No video yet - awaiting admin upload'}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex gap-2">
              <input
                placeholder="New lecture title"
                className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                value={newLectureTitle[courseModule._id] || ''}
                onChange={(e) =>
                  setNewLectureTitle((prev) => ({ ...prev, [courseModule._id]: e.target.value }))
                }
              />
              <button
                onClick={() => addLecture(courseModule._id)}
                className="rounded-md bg-ink px-3 py-1.5 text-sm text-white"
              >
                Add lecture
              </button>
            </div>

            <p className="mt-2 text-xs text-gray-400">
              Note: attaching the lecture video (YouTube or S3 upload) is done from the Admin
              dashboard's Video Management page, not here.
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
