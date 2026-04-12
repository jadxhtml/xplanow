const groupService = require('./group.service');
const Objective = require('../objectives/objective.model');
const logActivity = require('../../utils/activityLogger'); // Thêm import hàm ghi log

exports.createGroup = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const groupData = req.body;

        const group = await groupService.createGroup(groupData, userId);

        // 👉 Ghi log khi tạo nhóm thành công
        await logActivity(
            userId,
            'CREATE',
            'Group',
            group._id,
            `Đã tạo không gian làm việc mới: "${group.name}"`
        );

        res.status(201).json(group);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getUserGroups = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const groups = await groupService.getUserGroups(userId);
        res.status(200).json(groups);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.addMember = async (req, res) => {
    try {
        const groupId = req.params.id || req.user._id;
        const { email } = req.body;
        const userId = req.user.id;

        const group = await groupService.addMemberToGroup(groupId, email, userId);

        // 👉 Ghi log khi thêm thành viên thành công
        await logActivity(
            userId,
            'ADD_MEMBER',
            'Group',
            group._id,
            `Đã thêm thành viên (${email}) vào không gian làm việc "${group.name}"`
        );

        res.status(200).json(group);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getGroupById = async (req, res) => {
    try {
        const group = await groupService.getGroupById(req.params.id);
        res.status(200).json(group);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

exports.getPerformance = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id || req.user.id; // Lấy ID để check quyền Admin

        // Gọi service thống kê (sẽ đếm số lượng Task hoàn thành của mỗi user)
        const stats = await groupService.getGroupPerformanceStats(groupId, userId);

        res.status(200).json(stats);
    } catch (error) {
        res.status(403).json({ message: error.message });
    }
};

exports.removeMember = async (req, res) => {
    try {
        const groupId = req.params.id;
        const memberIdToRemove = req.params.memberId;
        const userId = req.user.id || req.user._id; // ID của người thực hiện (Trưởng nhóm)

        const group = await groupService.removeMemberFromGroup(groupId, memberIdToRemove, userId);

        // 👉 Ghi log hành động đuổi thành viên
        await logActivity(
            userId,
            'REMOVE_MEMBER',
            'Group',
            group._id,
            `Đã xóa một thành viên khỏi không gian làm việc "${group.name}"`
        );

        res.status(200).json({
            message: "Đã xóa thành viên thành công",
            group
        });
    } catch (error) {
        // Trả về 403 nếu không có quyền
        res.status(403).json({ message: error.message });
    }
};