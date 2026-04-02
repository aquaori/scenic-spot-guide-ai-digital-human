import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  timeout: 15000
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);
