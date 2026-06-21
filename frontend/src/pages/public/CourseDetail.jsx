import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import endpoints from '../../api/endpoints';
import VideoPlayer from '../../components/player/VideoPlayer';
import useAuth from '../../hooks/useAuth';

export default function CourseDetail() {
  const { slug } = useParams();
  const { isAuthenticated } = useAuth();
  const [course, setCourse] = useState(null);
  const [ownsCourse, setOwnsCourse] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    axiosClient.get(endpoints.courses.bySlug(slug)).then(({ data }) => {
      setCourse(data.data.course);
      setOwnsCourse(data.data.ownsCourse);
    });
  }, [slug]);

  async function handlePurchase(gateway) {
    setPurchasing(true);
    try {
      const { data } = await axiosClient.post(endpoints.courses.purchase(course._id), { gateway });
      window.location.href = data.data.checkoutUrl || data.data.gatewayPageUrl;
    } finally {
      setPurchasing(false);
    }
  }

  if (!course) return null;

  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-semibold">{course.title}</h1>
      <p className="mt-2 text-gray-600">{course.description}</p>

      {!ownsCourse && (
        <div className="mt-6 flex gap-3">
          <button
            disabled={!isAuthenticated || purchasing}
            onClick={() => handlePurchase('stripe')}
            className="rounded-md bg-ink px-4 py-2 text-white disabled:opacity-50"
          >
            Pay with card (Stripe)
          </button>
          <button
            disabled={!isAuthenticated || purchasing}
            onClick={() => handlePurchase('sslcommerz')}
            className="rounded-md border border-gray-300 px-4 py-2 disabled:opacity-50"
          >
            Pay with SSLCommerz
          </button>
        </div>
      )}

      <div className="mt-10 space-y-8">
        {course.modules.map((courseModule) => (
          <div key={courseModule._id}>
            <h2 className="font-medium">{courseModule.title}</h2>
            <ul className="mt-3 space-y-4">
              {courseModule.lectures.map((lecture) => (
                <li key={lecture._id}>
                  <p className="mb-2 text-sm font-medium">{lecture.title}</p>
                  {(ownsCourse || lecture.isPreview) && lecture.videoSource ? (
                    <VideoPlayer lecture={lecture} />
                  ) : (
                    <p className="text-sm text-gray-400">Purchase this course to unlock this lecture.</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
