const KeyResult = require('./keyResult.model');
const Task = require('../tasks/task.model');

exports.createKeyResult = async (data, userId) => {
    const newKR = await KeyResult.create({ ...data, user: userId });
    return newKR;
};

// 2. HÀM SỬA KR
exports.updateKeyResult = async (krId, updateData, userId) => {
    const updatedKr = await KeyResult.findByIdAndUpdate(
        krId,
        updateData,
        { new: true }
    );

    if (!updatedKr) throw new Error('Không tìm thấy Kết quả then chốt này để sửa!');
    return updatedKr;
};


exports.deleteKeyResult = async (krId, userId) => {
    const kr = await KeyResult.findById(krId);

    if (!kr) {
        throw new Error('Key Result này đã bị xóa hoặc không tồn tại từ trước rồi!');
    }
    await Task.deleteMany({ keyResult: krId });
    await KeyResult.findByIdAndDelete(krId);
    return { message: 'Đã xóa tận gốc Key Result và các Task con!' };
};