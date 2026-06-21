import axios from 'axios';

// VITE_API_URL is the backend's origin only (e.g. https://learncs01-api.onrender.com),
// set in Vercel's project environment variables. Locally it's unset, so this
// falls back to a relative path, which Vite's dev server proxy
// (vite.config.js) forwards to localhost:5000 - no env file needed for
// local development.
const API_ORIGIN = import.meta.env.VITE_API_URL || '';

const axiosClient = axios.create({
  baseURL: `${API_ORIGIN}/api/v1`,
  withCredentials: true, // sends the secure httpOnly JWT cookie automatically
  headers: { 'Content-Type': 'application/json' },
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Session expired/invalid - let the app-level auth state react to this
      // rather than forcing a hard redirect from inside the HTTP layer.
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default axiosClient;

