import axios from "axios";

const rawBaseURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8000" : "https://backend-proj-qphw.onrender.com");
const cleanBaseURL = rawBaseURL.replace(/\/+$/, "");

const api = axios.create({
    baseURL: cleanBaseURL,
    withCredentials: true, // Send HttpOnly cookies on every request automatically
});

// Redirect to login on 401 — cookie is managed by the browser, nothing to clear manually
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            const url = error.config?.url || "";
            // Skip redirect for /me — ProtectedRoute handles that itself
            const isProtectedRouteCheck = url.includes("/me");
            const isAuthPage = window.location.pathname === "/" || window.location.pathname === "/register";
            if (!isProtectedRouteCheck && !isAuthPage) {
                window.location.href = "/";  // login is at "/"
            }
        }
        return Promise.reject(error);
    }
);

export default api;