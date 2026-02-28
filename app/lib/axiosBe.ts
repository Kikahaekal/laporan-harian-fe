import axios from 'axios';

// Axios instance untuk laporan-be API (prefix: /api/web/)
const apiBe = axios.create({
    baseURL: 'http://localhost:8000',
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true,
});

// Helper: baca cookie by name
function getCookie(name: string): string | undefined {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        const cookieValue = parts.pop()?.split(';').shift();
        return cookieValue ? decodeURIComponent(cookieValue) : undefined;
    }
}

// Request interceptor — otomatis sertakan X-XSRF-TOKEN untuk mutasi
apiBe.interceptors.request.use(async (config) => {
    const method = config.method?.toUpperCase();
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method ?? '');

    if (isMutation) {
        let token = getCookie('XSRF-TOKEN');

        // Jika belum ada cookie CSRF, minta dulu ke Sanctum
        if (!token) {
            await apiBe.get('/sanctum/csrf-cookie');
            await new Promise((resolve) => setTimeout(resolve, 100));
            token = getCookie('XSRF-TOKEN');
        }

        if (token) {
            config.headers['X-XSRF-TOKEN'] = token;
        }
    }

    return config;
});

export default apiBe;
