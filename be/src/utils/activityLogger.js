const Activity = require('../modules/activities/activity.model');

const logActivity = async (userId, action, entityType, entityId, details, groupId = null) => {
    try {
        const newActivity = await Activity.create({
            user: userId,
            action,
            entityType,
            entityId,
            details,
            group: groupId
        });
        const populatedActivity = await Activity.findById(newActivity._id)
            .populate('user', 'username avatar');

        // 3. BẮN TÍN HIỆU REAL-TIME
        if (global.io) {
            // Phát sự kiện 'new_activity' kèm theo dữ liệu log vừa tạo
            // Tạm thời dùng emit() để gửi cho tất cả. 
            // Nếu muốn tối ưu, bạn có thể gửi riêng vào Room (Group) sau.
            global.io.emit('new_activity', populatedActivity);
        }

        console.log("Đã ghi log và bắn realtime thành công!");
    }
    catch (err) { console.error("Lỗi ghi log:", err); }
};
module.exports = logActivity;