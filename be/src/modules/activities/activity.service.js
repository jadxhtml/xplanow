const Activity = require('./activity.model');

// tao log
exports.logActivity = async (userId, action, entityType, entityId, details) => {
    try {
        await Activity.create({
            user: userId,
            action,
            entityType,
            entityId,
            details
        });
    } catch (error) {
        console.error("Lỗi khi ghi Log hoạt động:", error.message);
    }
};

// In ra 50 hoat dong gan nhat
exports.getUserActivities = async (userId) => {
    return await Activity.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
};