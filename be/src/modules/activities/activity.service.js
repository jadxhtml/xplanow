const Activity = require('./activity.model');

// 👉 1. Thêm tham số groupId vào cuối (để mặc định là null)
exports.logActivity = async (userId, action, entityType, entityId, details, groupId = null) => {
    try {
        await Activity.create({
            user: userId,
            action,
            entityType,
            entityId,
            details,
            group: groupId // 👉 2. Lưu vào Database
        });
    } catch (error) {
        console.error("Lỗi khi ghi Log hoạt động:", error.message);
    }
};

// In ra 50 hoat dong gan nhat (Của cá nhân)
exports.getUserActivities = async (userId) => {
    // 👉 Đã bỏ comment user: userId để tránh việc lấy full dữ liệu hệ thống
    return await Activity.find({ user: userId })
        .populate('user', 'username avatar email')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
};

// In ra hoạt động của Nhóm (Phần này bạn viết CHUẨN RỒI)
exports.getGroupActivities = async (groupId) => {
    const activities = await Activity.find({ group: groupId })
        .populate('user', 'username avatar email')
        .sort({ createdAt: -1 })
        .limit(50);

    return activities;
};