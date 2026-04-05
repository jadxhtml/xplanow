# HỆ THỐNG QUẢN LÝ TIẾN ĐỘ CÔNG VIỆC

## 1. Công nghệ sử dụng
- **Frontend:** React.js, Tailwind CSS, Ant Design.
- **Backend:** Node.js, Express.js.
- **Cơ sở dữ liệu:** MongoDB (Mongoose ODM).
- **Real-time:** Socket.io (Hỗ trợ nhắn tin nhóm).

## 2. Yêu cầu môi trường (Prerequisites)
- Node.js (Phiên bản v16.x hoặc v18.x trở lên).
- MongoDB (Cài đặt MongoDB Server local hoặc sử dụng MongoDB Atlas).

## 3. Cấu trúc thư mục
- `/fe`: Chứa mã nguồn giao diện người dùng (React SPA).
- `/be`: Chứa mã nguồn máy chủ API và WebSockets (Node.js/Express).
- `README.md`: Hướng dẫn cài đặt và khởi chạy.

## 4. Hướng dẫn cài đặt và khởi chạy dự án

### Bước 4.1: Khởi chạy Backend (Server)
1. Mở terminal, di chuyển vào thư mục backend: `cd be`
2. Cài đặt các thư viện cần thiết: `npm install`
3. Cấu hình file biến môi trường: Đổi tên file `.env.example` thành `.env` (Đảm bảo chuỗi kết nối MongoDB là chính xác, mặc định: `mongodb://127.0.0.1:27017/TaskApp_Capstone`).
4. Khởi chạy server: `npm run dev` (hoặc `npm start`)
-> Server sẽ chạy tại: http://localhost:5000

### Bước 4.2: Khởi chạy Frontend (Client)
1. Mở một terminal mới, di chuyển vào thư mục frontend: `cd fe`
2. Cài đặt các thư viện cần thiết: `npm install`
3. Khởi chạy giao diện: `npm run dev` (hoặc `npm start`)
-> Giao diện sẽ tự động mở tại: http://localhost:5137 (hoặc cổng cấu hình tương ứng của Vite/CRA).

## 5. Tài khoản đăng nhập mặc định để test (Dữ liệu mẫu)
- **Tài khoản Admin/Trưởng nhóm:**
  - Email: user3@gmail.com
  - Mật khẩu: 123
- **Tài khoản Thành viên:**
  - Email: user2@gmail.com
  - Mật khẩu: 123
