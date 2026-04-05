import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api', // dia chi backend
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use( //tu dong gan token vao moi~ request neu da~ dang nhap
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;

