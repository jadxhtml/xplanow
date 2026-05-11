const Message = require('./message.model');

exports.getGroupMessages = async (req, res) => {
    try {
        const { groupId } = req.params;
        // Lấy tin nhắn, sắp xếp từ cũ đến mới (1) để chatbox hiển thị từ trên xuống dưới
        const messages = await Message.find({ group: groupId })
            .populate('senderId', 'username avatar')
            .sort({ createdAt: 1 });

        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(200).json({ message: 'Khong co file nao duoc tai len' });
        }
        res.status(200).json({
            url: req.file.path,
            name: req.file.originalname
        });
    } catch (error) {
        console.error("🔴 LỖI UPLOAD CLOUDINARY:", error);
        res.status(500).json({ message: error.message });
    }
}

//tha reaction
exports.toggleReaction = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user.id || req.user._id;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: "Không tìm thấy tin nhắn" });

        // Kiểm tra xem user này đã thả biểu tượng NÀY chưa?
        const existingIndex = message.reactions.findIndex(
            r => r.userId.toString() === userId.toString() && r.emoji === emoji
        );

        if (existingIndex !== -1) {
            // Nếu có rồi -> Thu hồi (Xóa đi)
            message.reactions.splice(existingIndex, 1);
        } else {
            // Nếu chưa có -> Thả vào
            message.reactions.push({ emoji, userId });
        }

        await message.save();

        // Trả về danh sách cảm xúc mới nhất
        res.status(200).json({ reactions: message.reactions });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};