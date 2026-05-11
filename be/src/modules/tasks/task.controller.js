const taskService = require('./task.service');
const Task = require('./task.model');
const logActivity = require('../../utils/activityLogger');
const Notification = require('../notifications/notification.model');
const { GoogleGenerativeAI } = require("@google/generative-ai");

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


exports.generateTasksByAI = async (req, res) => {
    try {
        // NHẬN THÊM MẢNG members TỪ FRONTEND
        const { prompt, members } = req.body;

        if (!prompt) return res.status(400).json({ message: "Vui lòng nhập nội dung yêu cầu AI." });

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();
        const validModel = data.models?.find(m => m.name.includes('flash') && m.supportedGenerationMethods.includes('generateContent'));

        if (!validModel) return res.status(500).json({ message: "API Key không hỗ trợ model Flash." });

        const modelName = validModel.name.replace('models/', '');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName });

        // Tạo chuỗi danh sách thành viên để mớm cho AI
        const memberListString = members && members.length > 0
            ? members.map(m => `- Tên: ${m.user.username}, ID: ${m.user._id}`).join('\n')
            : "Chưa có thành viên nào.";

        // 👉 PROMPT SIÊU NÂNG CẤP
        const systemPrompt = `
        Bạn là một chuyên gia quản lý dự án. Yêu cầu của người dùng: "${prompt}".
        Danh sách thành viên trong dự án:
        ${memberListString}

        Nhiệm vụ 1 (Lọc rác): Phân tích yêu cầu. Nếu yêu cầu là câu chào hỏi, trêu đùa, hoặc không phải là mục tiêu công việc rõ ràng, hãy từ chối.
        Nhiệm vụ 2 (Phân rã & Phân công): Nếu hợp lệ, phân rã thành các công việc (có thể lồng nhau). Dựa vào tên công việc, hãy tự động chọn "assignee" (là ID của thành viên phù hợp) từ danh sách trên. Nếu không chắc chắn, để null.

        BẮT BUỘC trả về ĐÚNG 1 OBJECT JSON với cấu trúc sau (Không thêm văn bản nào khác):
        {
            "isError": false, // true nếu từ chối, false nếu hợp lệ
            "message": "Lời giải thích hoặc lý do từ chối",
            "tasks": [
                {
                    "title": "Tên công việc",
                    "description": "Mô tả",
                    "priority": "high",
                    "assignee": "ID_thành_viên_hoặc_null",
                    "children": [
                         { "title": "...", "description": "...", "priority": "medium", "assignee": "ID" }
                    ]
                }
            ]
        }
        `;

        const result = await model.generateContent(systemPrompt);
        const cleanedText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();

        const aiResponse = JSON.parse(cleanedText);

        // 👉 CHỈ TRẢ VỀ CHO FRONTEND DUYỆT, KHÔNG LƯU GÌ VÀO DB CẢ
        return res.status(200).json(aiResponse);

    } catch (error) {
        console.error("Lỗi hệ thống AI:", error);
        res.status(500).json({ message: "Hệ thống AI đang bận hoặc cấu hình lỗi." });
    }
};

exports.saveAITasks = async (req, res) => {
    try {
        const { tasks, keyResultId, objectiveId, groupId } = req.body;
        const userId = req.user.id || req.user._id;

        const savedTasks = [];
        for (const taskData of tasks) {
            const parentTask = await Task.create({
                title: taskData.title,
                description: taskData.description,
                priority: taskData.priority || 'medium',
                status: 'todo',
                assignee: taskData.assignee || null, // Lưu người được AI chọn
                keyResult: keyResultId || null,
                objective: objectiveId || null,
                user: userId
            });
            savedTasks.push(parentTask);

            if (taskData.children && taskData.children.length > 0) {
                for (const childData of taskData.children) {
                    const childTask = await Task.create({
                        title: childData.title,
                        description: childData.description,
                        priority: childData.priority || 'medium',
                        status: 'todo',
                        assignee: childData.assignee || null,
                        parent: parentTask._id,
                        keyResult: keyResultId || null,
                        objective: objectiveId || null,
                        user: userId
                    });
                    savedTasks.push(childTask);
                }
            }
        }

        if (savedTasks.length > 0) {
            await logActivity(userId, 'CREATE_AI', 'Task', savedTasks[0]._id, `Đã duyệt và lưu ${savedTasks.length} công việc từ AI`, groupId);
        }

        return res.status(200).json({ message: "Lưu công việc thành công!" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi lưu công việc vào hệ thống." });
    }
};