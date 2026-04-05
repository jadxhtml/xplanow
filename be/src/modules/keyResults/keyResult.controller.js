const keyResultService = require('./keyResult.service');
const logActivity = require('../../utils/activityLogger');

exports.createKeyResult = async (req, res) => {
    try {
        const keyResult = await keyResultService.createKeyResult(req.body, req.user.id);
        await logActivity(req.user.id, 'CREATE', 'KEY_RESULT', `Đã thêm kết quả (KR): ${keyResult.title}`);
        res.status(201).json(keyResult);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateKeyResult = async (req, res) => {
    try {
        const keyResult = await keyResultService.updateKeyResult(req.params.id, req.body, req.user.id);
        await logActivity(req.user.id, 'UPDATE', 'KEY_RESULT', `Đã cập nhật tiến độ KR: ${keyResult.title} (${keyResult.progress}%)`);
        res.status(200).json(keyResult);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteKeyResult = async (req, res) => {
    try {
        const result = await keyResultService.deleteKeyResult(req.params.id, req.user.id);
        await logActivity(req.user.id, 'DELETE', 'KEY_RESULT', `Đã xóa kết quả then chốt`);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};