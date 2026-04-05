const Conversation = require('./conversation.model');

exports.createOrGetDirectConversation = async (userId, targetUserId) => {
    let conversation = await Conversation.findOne({
        type: 'direct',
        participants: { $all: [userId, targetUserId] }
    }).populate('participants', 'username email avatar');

    if (!conversation) {
        conversation = await Conversation.create({
            type: 'direct',
            participants: [userId, targetUserId]
        });
        conversation = await Conversation.findById(conversation._id).populate('participants', 'username email avatar');
    }

    return conversation;
};

exports.getUserConversations = async (userId) => {
    try {
        const conversations = await Conversation.find({
            participants: { $in: [userId] }
        })
            .populate('participants', 'username email avatar')
            .populate({
                path: 'lastMessage',
                populate: { path: 'senderId', select: 'username' }
            })
            .sort({ updatedAt: -1 });
        return conversations;
    } catch (error) {
        throw new Error("Không thể tải danh sách cuộc trò chuyện: " + error.message);
    }
};