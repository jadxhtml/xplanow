const Notification = require('./notification.model');
const Group = require('../groups/group.model');

// Lấy danh sách thông báo của user đang đăng nhập
exports.getMyNotifications = async (req, res) => {
    try {
        const currentUserId = req.user.id || req.user._id;
        const notifications = await Notification.find({ recipientId: currentUserId })
            .populate('senderId', 'username avatar')
            .sort({ createdAt: -1 }) // Mới nhất lên đầu
            .limit(20); // Lấy 20 cái gần nhất cho nhẹ

        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Đánh dấu đã đọc thông báo
exports.markAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipientId: req.user.id || req.user._id, isRead: false },
            { $set: { isRead: true } }
        );
        res.status(200).json({ message: "Đã đọc tất cả" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Xử lý phản hồi lời mời (Chấp nhận / Từ chối)
exports.respondToInvite = async (req, res) => {
    try {
        const { notificationId, action } = req.body; // action: 'ACCEPT' hoặc 'REJECT'
        const currentUserId = req.user.id || req.user._id;

        const noti = await Notification.findById(notificationId);
        if (!noti || noti.recipientId.toString() !== currentUserId.toString()) {
            return res.status(403).json({ message: "Không có quyền thao tác!" });
        }

        if (noti.actionStatus !== 'PENDING') {
            return res.status(400).json({ message: "Lời mời này đã được xử lý rồi!" });
        }

        if (action === 'ACCEPT') {
            // Thêm người này vào nhóm
            await Group.findByIdAndUpdate(noti.refId, {
                $addToSet: { members: { user: currentUserId, role: 'member' } }
            });
            noti.actionStatus = 'ACCEPTED';
        } else {
            noti.actionStatus = 'REJECTED';
        }

        noti.isRead = true;
        await noti.save();

        res.status(200).json({
            message: `Bạn đã ${action === 'ACCEPT' ? 'tham gia nhóm' : 'từ chối lời mời'} thành công!`,
            notification: noti
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};