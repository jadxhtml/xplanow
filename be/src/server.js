const Conversation = require('./modules/conversations/conversation.model');
const dotenv = require('dotenv');
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const multer = require('multer');
const path = require('path');
const express = require("express")
const { Server } = require('socket.io');
const Message = require('./modules/messages/message.model');
dotenv.config();

connectDB();
// 1. Cấp quyền cho Frontend đọc thư mục 'uploads'
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 2. Cấu hình Multer: Lưu file vào thư mục 'be/uploads'
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // NHỚ TẠO THƯ MỤC TÊN LÀ 'uploads' Ở NGOÀI CÙNG THƯ MỤC 'be' NHÉ
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        // Đổi tên file để không bị trùng (thêm timestamp)
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// 3. Tạo API Upload
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Không nhận được file" });

    // Tạo đường dẫn URL trả về cho Frontend
    const PORT = process.env.PORT || 5000;
    const fileUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;

    res.json({
        url: fileUrl,
        name: req.file.originalname,
        mimetype: req.file.mimetype
    });
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

global.io = io;
io.on('connection', (socket) => {
    console.log(`Một user vừa kết nối: ${socket.id}`);

    socket.on('join_room', (conversationId) => {
        socket.join(conversationId);
        console.log(`User ${socket.id} đã vào phòng chat: ${conversationId}`);
    });

    // be/src/server.js (hoặc file chứa io.on('connection'))

    socket.on('send_message', async (data) => {
        try {
            console.log("📥 [SOCKET] Backend nhận được tin nhắn cần lưu:", data);

            const Message = require('./modules/messages/message.model'); // Trỏ lại đúng đường dẫn file model của bạn

            // 1. TẠO VÀ LƯU VÀO DATABASE
            const newMessage = await Message.create({
                group: data.groupId,       // Dữ liệu từ Frontend gửi lên là groupId
                senderId: data.senderId,
                message: data.message || "",     // Có thể rỗng nếu chỉ gửi ảnh
                type: data.type || 'text',       // 👉 Thêm trường type
                fileUrl: data.fileUrl || null,   // 👉 Thêm fileUrl
                fileName: data.fileName || null
            });

            console.log("✅ [DB] Đã lưu tin nhắn vào MongoDB thành công!");

            // 2. Lấy thêm thông tin Avatar và Username người gửi để trả về Frontend
            const populatedMsg = await Message.findById(newMessage._id).populate('senderId', 'username avatar');

            // 3. Phát lại tin nhắn cho tất cả những người đang mở Nhóm này
            io.to(data.groupId).emit('receive_message', populatedMsg);

        } catch (error) {
            // 👉 NẾU LƯU THẤT BẠI, LỖI SẼ BÁO Ở ĐÂY CHỨ KHÔNG IM LẶNG NỮA
            console.error("❌ [LỖI SOCKET] Không thể lưu tin nhắn:", error);
        }
    });
    //hieu ung go phim
    socket.on('typing', (data) => {
        socket.to(data.roomId).emit('display_typing', data.userName);
    });

    socket.on('stop_typing', (roomId) => {
        socket.to(roomId).emit('hide_typing');
    });

    socket.on('disconnect', () => {
        console.log(`User đã ngắt kết nối: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`)
})