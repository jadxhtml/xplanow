const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Người nhận
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Người gửi (VD: Trưởng nhóm)
    type: {
        type: String,
        enum: ['GROUP_INVITE', 'TASK_ASSIGNED', 'SYSTEM'],
        required: true
    },
    refId: { type: mongoose.Schema.Types.ObjectId }, // Lưu ID của Group hoặc Task liên quan
    content: { type: String, required: true }, // Nội dung thông báo
    isRead: { type: Boolean, default: false }, // Đã đọc chưa
    actionStatus: {
        type: String,
        enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'NONE'],
        default: 'PENDING'
    } // Trạng thái của nút Bấm (Dành riêng cho loại hình có lời mời)
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);