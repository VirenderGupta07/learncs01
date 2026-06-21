const YOUTUBE_ID_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

/**
 * Extracts an 11-character YouTube video ID from a full URL (watch, embed,
 * or youtu.be short-link form) or accepts a bare ID directly. Returns null
 * for anything that doesn't match. Pure function - directly unit-testable.
 */
function extractYoutubeId(input) {
  if (typeof input !== 'string') return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  const match = input.match(YOUTUBE_ID_REGEX);
  return match ? match[1] : null;
}

module.exports = { extractYoutubeId };
