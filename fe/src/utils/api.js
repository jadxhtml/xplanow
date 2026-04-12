import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');

                if (!refreshToken) {
                    localStorage.clear();
                    window.location.href = '/login';
                    return Promise.reject(error);
                }

                const res = await axios.post('http://localhost:5000/api/auth/refresh', { refreshToken });

                if (res.data.accessToken) {

                    localStorage.setItem('accessToken', res.data.accessToken);
                    if (res.data.refreshToken) {
                        localStorage.setItem('refreshToken', res.data.refreshToken);
                    }

                    originalRequest.headers['Authorization'] = `Bearer ${res.data.accessToken}`;

                    return api(originalRequest);
                }
            } catch (refreshError) {
                console.error("Phiên đăng nhập đã hết hạn hoàn toàn!");
                localStorage.clear();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;