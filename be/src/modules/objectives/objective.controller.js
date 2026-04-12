const objectiveService = require('./objective.service');
const Objective = require('./objective.model');
const logActivity = require('../../utils/activityLogger');

exports.getOkrTree = async (req, res) => {
    try {
        const { groupId } = req.query;
        if (!groupId || groupId === 'undefined') {
            return res.status(200).json([]);
        }
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
        const userId = req.user.id || req.user._id;
        const groupId = req.body.group || req.body.groupId; // Lấy groupId để ghi Log

        await logActivity(
            userId,
            'CREATE',
            'Objective',
            objective._id,
            `Đã tạo mục tiêu mới: "${objective.title}"`,
            groupId // 👉 Bổ sung groupId để hiện Log
        );
        res.status(201).json(objective);
    } catch (error) {
        console.log("Lỗi:", error.stack);
        res.status(400).json({ message: error.message });
    }
};

exports.updateObjective = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const userId = req.user._id || req.user.id;
        const groupId = req.body.groupId || req.query.groupId;

        const existingObj = await Objective.findById(id);
        if (!existingObj) {
            return res.status(404).json({ message: "Không tìm thấy công việc" });
        }

        // 1. TRƯỜNG HỢP: CẬP NHẬT TIẾN ĐỘ (Kéo thanh trượt / Checkbox)
        if (updateData.progress !== undefined) {
            const oldValue = existingObj.progress;
            const updatedObj = await objectiveService.updateProgressService(id, updateData.progress, userId);

            if (oldValue !== updateData.progress) {
                await logActivity(
                    userId,
                    'UPDATE_PROGRESS',
                    'Objective',
                    id,
                    `Cập nhật tiến độ từ ${oldValue}% lên ${updateData.progress}%`,
                    groupId // 👉 Thêm groupId
                );
            }
            return res.status(200).json(updatedObj);
        }

        // 2. TRƯỜNG HỢP: CẬP NHẬT TỪ MODAL (Tên, Mô tả, Hạn chót, Phụ trách)
        existingObj.title = updateData.title || existingObj.title;

        if (updateData.description !== undefined) existingObj.description = updateData.description;
        if (updateData.deadline !== undefined) existingObj.deadline = updateData.deadline;

        // 👉 Xử lý mảng assignees (Người phụ trách)
        if (updateData.assignees !== undefined) {
            existingObj.assignees = updateData.assignees;
        }

        const updatedObj = await existingObj.save();

        // Ghi log cho thao tác cập nhật Form
        await logActivity(
            userId,
            'UPDATE',
            'Objective',
            id,
            `Đã cập nhật mục tiêu: "${updatedObj.title}"`,
            groupId
        );

        return res.status(200).json(updatedObj);

    } catch (error) {
        console.error("Lỗi cập nhật:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteObjective = async (req, res) => {
    try {
        const groupId = req.query.groupId || req.body?.groupId; // Lấy groupId từ query

        // Lấy tên objective để log cho đẹp trước khi xóa
        const objToDelete = await Objective.findById(req.params.id);
        const objTitle = objToDelete ? objToDelete.title : "Mục tiêu";

        const result = await objectiveService.deleteObjective(req.params.id, req.user.id);

        await logActivity(
            req.user.id,
            'DELETE',
            'Objective',
            req.params.id, // 👉 Tham số này của bạn đang bị thiếu ở bản cũ
            `Đã xóa mục tiêu: "${objTitle}"`,
            groupId // 👉 Bổ sung groupId để hiện Log
        );

        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.assignMembers = async (req, res) => {
    try {
        const { id } = req.params;
        const { assignees } = req.body;
        const userId = req.user._id;

        if (!Array.isArray(assignees)) {
            return res.status(400).json({ message: "Dữ liệu assignees phải là một mảng các ID." });
        }

        const updatedObjective = await objectiveService.assignMembersService(id, assignees, userId);

        res.status(200).json({
            message: "Giao việc thành công",
            data: updatedObjective
        });
    } catch (error) {
        const statusCode = error.message.includes("quyền") ? 403 : 500;
        res.status(statusCode).json({ message: error.message });
    }
};