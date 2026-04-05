const conversationService = require('./conversation.service');

exports.createOrGetDirect = async (req, res) => {
    try {
        const { targetUserId } = req.body;

        const conversation = await conversationService.createOrGetDirectConversation(req.user.id, targetUserId);
        res.status(200).json(conversation);
    } catch (error) {
        console.error("Lỗi tạo phòng chat:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.getUserConversations = async (req, res) => {
    try {
        const conversations = await conversationService.getUserConversations(req.user.id);
        res.status(200).json(conversations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};