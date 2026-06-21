import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import endpoints from '../../api/endpoints';
import useAuth from '../../hooks/useAuth';

/**
 * This page is only reachable by admin-dashboard users who hold the
 * `manageVideos` (or `manageCourses`) permission - see RoleRoute usage in
 * App.jsx. Instructors never see this page; they only create lecture
 * metadata from the Instructor Studio. This is the single place in the
 * whole app where a lecture's actual video gets attached or replaced.
 */
export default function VideoManager() {
  const { can, isSuperAdmin } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [course, setCourse] = useState(null);
  const [youtubeInputs, setYoutubeInputs] = useState({});
  const [uploadingLectureId, setUploadingLectureId] = useState(null);

  const allowed = isSuperAdmin || can('manageVideos') || can('manageCourses');

  useEffect(() => {
    axiosClient.get(endpoints.courses.list).then(({ data }) => setCourses(data.data.courses));
  }, []);

  useEffect(() => {
    if (!selectedCourseId) return;
    axiosClient.get(`/courses/by-id/${selectedCourseId}`).then(({ data }) => setCourse(data.data.course));
  }, [selectedCourseId]);

  async function attachYoutube(lectureId) {
    const youtubeUrl = youtubeInputs[lectureId];
    if (!youtubeUrl) return;
    const { data } = await axiosClient.patch(endpoints.admin.videoYoutube(course._id, lectureId), { youtubeUrl });
    updateLectureInState(lectureId, data.data.lecture);
  }

  async function uploadToS3(lectureId, file) {
    setUploadingLectureId(lectureId);
    try {
      const { data: presign } = await axiosClient.post(endpoints.admin.videoPresign(course._id, lectureId), {
        fileName: file.name,
        contentType: file.type,
      });

      // Direct browser -> S3 upload; the video bytes never pass through our API.
      await fetch(presign.data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });

      const { data: confirmed } = await axiosClient.patch(endpoints.admin.videoConfirm(course._id, lectureId));
      updateLectureInState(lectureId, confirmed.data.lecture);
    } finally {
      setUploadingLectureId(null);
    }
  }

  function updateLectureInState(lectureId, updatedLecture) {
    setCourse((prev) => ({
      ...prev,
      modules: prev.modules.map((m) => ({
        ...m,
        lectures: m.lectures.map((l) => (l._id === lectureId ? { ...l, ...updatedLecture } : l)),
      })),
    }));
  }

  if (!allowed) {
    return (
      <p className="text-sm text-gray-500">
        You don't have permission to manage videos. Ask the Super Admin to grant the "Manage Videos"
        permission from Staff &amp; Permissions.
      </p>
    );
  }

  return (
    <section>
      <h1 className="mb-6 text-xl font-semibold">Video Management</h1>

      <select
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        value={selectedCourseId}
        onChange={(e) => setSelectedCourseId(e.target.value)}
      >
        <option value="">Select a course…</option>
        {courses.map((c) => (
          <option key={c._id} value={c._id}>
            {c.title}
          </option>
        ))}
      </select>

      {course && (
        <div className="mt-8 space-y-8">
          {course.modules.map((courseModule) => (
            <div key={courseModule._id}>
              <h2 className="text-sm font-medium text-gray-500">{courseModule.title}</h2>
              <ul className="mt-3 space-y-4">
                {courseModule.lectures.map((lecture) => (
                  <li key={lecture._id} className="rounded-md border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{lecture.title}</p>
                      <span className="text-xs text-gray-400">
                        {lecture.videoSource === 'youtube' && lecture.youtubeVideoId
                          ? `YouTube: ${lecture.youtubeVideoId}`
                          : lecture.videoSource === 's3'
                          ? `S3: ${lecture.s3?.status}`
                          : 'No video attached'}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex gap-2">
                        <input
                          placeholder="YouTube URL or video ID"
                          className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                          value={youtubeInputs[lecture._id] || ''}
                          onChange={(e) =>
                            setYoutubeInputs((prev) => ({ ...prev, [lecture._id]: e.target.value }))
                          }
                        />
                        <button
                          onClick={() => attachYoutube(lecture._id)}
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                        >
                          Attach
                        </button>
                      </div>

                      <div>
                        <input
                          type="file"
                          accept="video/*"
                          disabled={uploadingLectureId === lecture._id}
                          onChange={(e) => e.target.files[0] && uploadToS3(lecture._id, e.target.files[0])}
                          className="text-sm"
                        />
                        {uploadingLectureId === lecture._id && (
                          <p className="mt-1 text-xs text-gray-400">Uploading to S3…</p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
