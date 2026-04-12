// src/utils/socket.js
import { io } from 'socket.io-client';

// Khởi tạo 1 kết nối duy nhất cho toàn bộ ứng dụng
const socket = io('http://localhost:5000'); // Thay bằng URL thật khi deploy

export default socket;