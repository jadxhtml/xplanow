const activityService = require('./activity.service');

// Đổi tên hàm thành getActivities cho chuẩn (nếu file route của bạn đang gọi tên khác thì giữ nguyên tên cũ nhé)
exports.getActivities = async (req, res) => {
    try {
        // 👉 1. BẮT BUỘC PHẢI LẤY groupId TỪ REQUEST
        const { groupId } = req.query;

        // 👉 2. Tường lửa ngăn rò rỉ dữ liệu
        if (!groupId || groupId === 'undefined') {
            return res.status(200).json([]);
        }

        // 👉 3. GỌI ĐÚNG HÀM CỦA NHÓM (Thay vì gọi getUserActivities)
        const activities = await activityService.getGroupActivities(groupId);

        res.status(200).json(activities);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};