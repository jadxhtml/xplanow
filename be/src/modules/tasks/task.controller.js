const taskService = require('./task.service');
const Task = require('./task.model');
const logActivity = require('../../utils/activityLogger');

exports.getTask = async (req, res) => {
    try {
        const taskTree = await taskService.getTaskTree(req.user.id);
        res.status(200).json(taskTree);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createTask = async (req, res) => {
    try {
        const task = await taskService.createTask(req.body, req.user.id);

        // 👉 Lấy groupId từ body hoặc query
        const groupId = req.body.groupId || req.query.groupId;

        await logActivity(
            req.user.id,
            'CREATE',
            'Task',
            task._id,
            `Đã tạo công việc: ${task.title}`,
            groupId // 👉 THÊM GROUP ID VÀO ĐÂY
        );

        res.status(201).json(task);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateTask = async (req, res) => {
    try {
        const taskId = req.params.id;
        const userId = req.user.id || req.user._id;
        const updateData = req.body;

        // 👉 Lấy groupId từ body hoặc query
        const groupId = req.body.groupId || req.query.groupId;

        const oldTask = await Task.findById(taskId);
        if (!oldTask) {
            return res.status(404).json({ message: "Không tìm thấy công việc" });
        }
        const oldStatus = oldTask.status;

        const task = await taskService.updateTask(taskId, updateData, userId);

        if (updateData.status && updateData.status !== oldStatus) {
            if (updateData.status === 'done') {
                await logActivity(userId, 'COMPLETE_TASK', 'Task', task._id, `Đã hoàn thành công việc: ${task.title}`, groupId);
            } else {
                await logActivity(userId, 'UPDATE_STATUS', 'Task', task._id, `Chuyển trạng thái "${task.title}" từ ${oldStatus} sang ${updateData.status}`, groupId);
            }
        } else {
            // 👉 THÊM GROUP ID VÀO ĐÂY CHO CẬP NHẬT BÌNH THƯỜNG
            await logActivity(userId, 'UPDATE', 'Task', task._id, `Đã cập nhật thông tin công việc: ${task.title}`, groupId);
        }

        res.status(200).json(task);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteTask = async (req, res) => {
    try {
        const taskId = req.params.id;
        const userId = req.user.id || req.user._id;

        // 👉 Lấy groupId từ body hoặc query
        const groupId = req.query.groupId || req.body?.groupId;

        const taskToDelete = await Task.findById(taskId);
        if (!taskToDelete) {
            return res.status(404).json({ message: "Không tìm thấy công việc" });
        }

        const result = await taskService.deleteTask(taskId, userId);

        await logActivity(
            userId,
            'DELETE',
            'Task',
            taskId,
            `Đã xóa công việc: "${taskToDelete.title}"`,
            groupId // 👉 THÊM GROUP ID VÀO ĐÂY
        );

        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};