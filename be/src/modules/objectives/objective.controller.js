const objectiveService = require('./objective.service');
const Objective = require('./objective.model');
const logActivity = require('../../utils/activityLogger');

exports.getOkrTree = async (req, res) => {
    try {
        const { groupId } = req.query;
        const tree = await objectiveService.getOkrTree(req.user.id, groupId);
        res.status(200).json(tree);
    } catch (error) {
        console.error("LỖI MEGA-TREE TẠI BACKEND:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.createObjective = async (req, res) => {
    try {
        const objective = await objectiveService.createObjective(req.body, req.user.id);
        await logActivity(req.user.id, 'CREATE', 'OBJECTIVE', `Đã tạo mục tiêu mới: ${objective.title}`);
        res.status(201).json(objective);
    } catch (error) {
        console.log("Lỗi:", error.stack);
        res.status(400).json({ message: error.message });
    }
};

exports.updateObjective = async (req, res) => {
    try {
        const objectiveId = req.params.id;
        const updateData = req.body;
        const updatedObj = await Objective.findByIdAndUpdate(
            objectiveId,
            updateData,
            { new: true }
        );

        if (!updatedObj) {
            return res.status(404).json({ message: 'Không tìm thấy Mục tiêu này!' });
        }
        await logActivity(req.user.id, 'UPDATE', 'OBJECTIVE', `Đã cập nhật mục tiêu: ${updatedObj.title}`);

        res.status(200).json(updatedObj);
    } catch (error) {
        console.error("Lỗi khi update Objective:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.deleteObjective = async (req, res) => {
    try {
        const result = await objectiveService.deleteObjective(req.params.id, req.user.id);
        await logActivity(req.user.id, 'DELETE', 'OBJECTIVE', `Đã xóa một mục tiêu khỏi hệ thống`);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};