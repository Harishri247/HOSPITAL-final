import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach JWT token & Sanitize URL/params against "null" strings
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hpms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Safety guard: prevent API calls with literal "/null" or "/undefined" in URL path
    if (config.url) {
      if (/\/null(\/|\?|$)/i.test(config.url) || /\/undefined(\/|\?|$)/i.test(config.url)) {
        console.warn(`[Axios Safety Guard] Aborted request with invalid 'null'/'undefined' path variable: ${config.url}`);
        return Promise.reject(new Error(`Invalid API call: URL path contains null or undefined identifier (${config.url})`));
      }
    }

    // Sanitize query params: strip out any 'null', 'undefined', null or undefined parameters
    if (config.params && typeof config.params === 'object') {
      const cleanedParams = { ...config.params };
      Object.keys(cleanedParams).forEach((key) => {
        const val = cleanedParams[key];
        if (val === null || val === undefined || val === 'null' || val === 'undefined') {
          delete cleanedParams[key];
        }
      });
      config.params = cleanedParams;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401/403
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized on protected resource, clear storage and dispatch logout
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        localStorage.removeItem('hpms_token');
        localStorage.removeItem('hpms_user');
        window.location.href = '/login?session_expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
