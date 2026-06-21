import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'https://api.learncs01.com/api/v1'; // point at API_PUBLIC_URL in dev

const axiosClient = axios.create({ baseURL: API_BASE_URL });

// The web app relies on a secure httpOnly cookie, which React Native cannot
// read or rely on persisting the same way. Mobile instead stores the JWT in
// the OS keychain (expo-secure-store) and sends it as a Bearer header - the
// backend's `protect` middleware already accepts both, so no API changes
// were needed to support this.
axiosClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('learncs01_jwt');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('learncs01_jwt');
    }
    return Promise.reject(error);
  }
);

export async function persistToken(token) {
  await SecureStore.setItemAsync('learncs01_jwt', token);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync('learncs01_jwt');
}

export default axiosClient;
