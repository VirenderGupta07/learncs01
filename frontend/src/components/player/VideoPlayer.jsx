import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';

/**
 * Renders whichever video source the admin dashboard attached to this
 * lecture. YouTube needs no extra request - the videoId is embedded
 * directly. S3 lectures need a short-lived signed playback URL, fetched
 * just-in-time so the link can't be scraped and reused indefinitely.
 */
export default function VideoPlayer({ lecture }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(lecture.videoSource === 's3');

  useEffect(() => {
    if (lecture.videoSource !== 's3' || !lecture.s3?.key) return;

    let cancelled = false;
    setLoading(true);

    axiosClient
      .get(`/courses/lectures/${lecture._id}/playback-url`)
      .then(({ data }) => {
        if (!cancelled) setSignedUrl(data.data.url);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lecture._id, lecture.videoSource, lecture.s3?.key]);

  if (lecture.videoSource === 'youtube' && lecture.youtubeVideoId) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${lecture.youtubeVideoId}`}
          title={lecture.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (lecture.videoSource === 's3') {
    if (loading) {
      return <div className="aspect-video w-full animate-pulse rounded-lg bg-gray-200" />;
    }
    if (signedUrl) {
      return (
        <video className="aspect-video w-full rounded-lg bg-black" controls controlsList="nodownload" src={signedUrl} />
      );
    }
  }

  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-500">
      Video not available yet.
    </div>
  );
}
