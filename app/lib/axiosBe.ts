import axios from "axios";

// Variabel memori untuk menyimpan raw CSRF token yang benar
// Ini menghindari bug 'stale cookie shadowing' di browser.
let memoryCsrfToken: string | null = null;
const apiBaseUrl = "https://api.pinangmajusejahtera.my.id";
// const apiBaseUrl = import.meta.env.VITE_API_URL;

// Axios instance untuk laporan-be API (prefix: /api/web/)
const apiBe = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
});

/**
 * Paksa refresh CSRF cookie dan ambil token asli dari server.
 */
export async function refreshCsrf() {
  // 1. Pastikan session cookie Sanctum diset
  await axios.get(`${apiBaseUrl}/sanctum/csrf-cookie`, {
    withCredentials: true,
  });

  // 2. Ambil token yang paling valid langsung dari body response (bukan dari document.cookie)
  try {
    const res = await axios.get(`${apiBaseUrl}/api/web/csrf-token`, {
      withCredentials: true,
      headers: {
        Accept: "application/json",
      },
    });
    if (res.data && res.data.token) {
      memoryCsrfToken = res.data.token;
    }
  } catch (err) {
    console.error("Gagal mengambil raw CSRF token", err);
  }
}

// Request interceptor — MANUAL INJECT X-CSRF-TOKEN
// Kita pakai X-CSRF-TOKEN (bukan X-XSRF-TOKEN) karena token ini tidak terenkripsi
apiBe.interceptors.request.use(async (config) => {
  // Kalau mau login, Hapus memori token lama agar dipaksa ambil baru
  if (config.url?.endsWith("/login")) {
    memoryCsrfToken = null;
  }

  const method = config.method?.toUpperCase();
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method ?? "");

  if (isMutation) {
    if (!memoryCsrfToken) {
      await refreshCsrf();
    }
    if (memoryCsrfToken) {
      config.headers["X-CSRF-TOKEN"] = memoryCsrfToken;
    }
  }
  return config;
});

// Response interceptor — jika 419, refresh CSRF dan retry sekali
apiBe.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 419 && !originalRequest._csrfRetry) {
      originalRequest._csrfRetry = true;

      // Hapus token lama dari memori dan header
      memoryCsrfToken = null;
      delete originalRequest.headers["X-CSRF-TOKEN"];
      delete originalRequest.headers["X-XSRF-TOKEN"];

      // Refresh CSRF dari server
      await refreshCsrf();

      // Inject token baru
      if (memoryCsrfToken) {
        originalRequest.headers["X-CSRF-TOKEN"] = memoryCsrfToken;
      }

      return apiBe(originalRequest);
    }
    return Promise.reject(error);
  },
);

export default apiBe;
