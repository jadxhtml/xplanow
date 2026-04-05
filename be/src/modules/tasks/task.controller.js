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

        // 👉 Đã sửa: Dùng đúng biến 'task' và 'req.user.id'
        await logActivity(req.user.id, 'CREATE', 'TASK', `Đã tạo công việc: ${task.title}`);

        res.status(201).json(task);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateTask = async (req, res) => {
    try {
        const task = await taskService.updateTask(req.params.id, req.body, req.user.id);

        // 👉 Đã sửa: Dùng đúng biến 'task'
        if (req.body.status === 'done') {
            await logActivity(req.user.id, 'COMPLETE', 'TASK', `Đã hoàn thành công việc: ${task.title} 🎯`);
        } else {
            await logActivity(req.user.id, 'UPDATE', 'TASK', `Đã cập nhật công việc: ${task.title}`);
        }
        res.status(200).json(task);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteTask = async (req, res) => {
    try {
        // 👉 Đã sửa: Đổi tên biến thành 'result' cho khớp với lệnh trả về ở dưới
        const result = await taskService.deleteTask(req.params.id, req.user.id);

        await logActivity(req.user.id, 'DELETE', 'TASK', `Đã xóa một công việc khỏi hệ thống`);

        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};