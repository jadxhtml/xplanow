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