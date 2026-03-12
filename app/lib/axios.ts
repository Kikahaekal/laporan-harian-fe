import axios from 'axios';

const api = axios.create({
    baseURL: 'https://api.pinangmajusejahtera.my.id',
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
});

// Jika menerima 419 (CSRF mismatch), refresh CSRF cookie lalu retry sekali
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 419 && !originalRequest._csrfRetry) {
            originalRequest._csrfRetry = true;
            await api.get('/sanctum/csrf-cookie');
            return api(originalRequest);
        }
        return Promise.reject(error);
    }
);

export default api;
