const Conversation = require('./modules/conversations/conversation.model');
const dotenv = require('dotenv');
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { Server } = require('socket.io');
const Message = require('./modules/messages/message.model');
dotenv.config();

connectDB();

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});
io.on('connection', (socket) => {
    console.log(`Một user vừa kết nối: ${socket.id}`);

    socket.on('join_room', (conversationId) => {
        socket.join(conversationId);
        console.log(`User ${socket.id} đã vào phòng chat: ${conversationId}`);
    });

    socket.on('send_message', async (data) => {
        try {
            // 1. luu tin nhan vao db (Bạn đã làm đúng)
            const newMessage = await Message.create({
                conversationId: data.conversationId,
                senderId: data.senderId,
                message: data.message
            });

            // 👉 MẢNH GHÉP CÒN THIẾU: Cập nhật tin nhắn này làm tin nhắn cuối cùng của phòng
            await Conversation.findByIdAndUpdate(data.conversationId, {
                lastMessage: newMessage._id
            });

            // 2. Lấy thông tin user gửi
            const populatedMessage = await Message.findById(newMessage._id)
                .populate('senderId', 'username email avatar');

            // 3. Phát loa cho phòng
            io.to(data.conversationId).emit('receive_message', populatedMessage);

        } catch (error) {
            console.error("Lỗi lưu tin nhắn:", error.message, error.stack);
        }
    });

    //hieu ung go phim
    socket.on('typing', (data) => {
        socket.to(data.conversationId).emit('display_typing', data.userName);
    });

    socket.on('stop_typing', (conversationId) => {
        socket.to(conversationId).emit('hide_typing');
    });

    socket.on('disconnect', () => {
        console.log(`User đã ngắt kết nối: ${socket.id}`);
    });
});

app.get('/api/messages/:conversationId', async (req, res) => {
    try {
        const { conversationId } = req.params;
        const messages = await Message.find({ conversationId })
            .populate('senderId', 'username email avatar')
            .sort({ createdAt: 1 })
            .limit(100);
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: "Lỗi tải tin nhắn" });
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`)
})