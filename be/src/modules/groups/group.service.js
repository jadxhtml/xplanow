const Group = require('./group.model');
const User = require('../users/user.model');
const Conversation = require('../conversations/conversation.model');
const Activity = require('../activities/activity.model');
const Objective = require('../objectives/objective.model');
const KeyResult = require('../keyResults/keyResult.model'); // 👉 Import thêm model KeyResult
const Task = require('../tasks/task.model'); // 👉 Import thêm model Task

// Tạo nhóm mới (người tạo là admin)
exports.createGroup = async (groupData, creatorId) => {
    const group = await Group.create({
        ...groupData,
        members: [{ user: creatorId, role: 'admin' }]
    });
    await Conversation.create({
        name: group.name,
        type: 'group',
        participants: [creatorId],
        groupId: group._id
    });
    return group;
};

// Lấy danh sách các nhóm mà User đang tham gia
exports.getUserGroups = async (userId) => {
    return await Group.find({ 'members.user': userId })
        .populate('members.user', 'username email')
        .lean();
};

// Thêm thành viên vào nhóm
exports.addMemberToGroup = async (groupId, email, requesterId) => {
    const group = await Group.findById(groupId);
    if (!group) throw new Error('Không tìm thấy nhóm');

    const isAdmin = group.members.some(m => m.user.toString() === requesterId && m.role === 'admin');
    if (!isAdmin) throw new Error('Chỉ Admin mới có quyền thêm thành viên');

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) throw new Error('Không tìm thấy tài khoản với email này');

    const isAlreadyMember = group.members.some(m => m.user.toString() === userToAdd._id.toString());
    if (isAlreadyMember) throw new Error('Người dùng này đã ở trong nhóm');

    group.members.push({ user: userToAdd._id, role: 'member' });
    await group.save();

    await Conversation.findOneAndUpdate(
        { groupId: groupId },
        { $addToSet: { participants: userToAdd._id } }
    );

    return group;
};

// Lưu thông tin chi tiết nhóm
exports.getGroupById = async (groupId) => {
    const group = await Group.findById(groupId)
        .populate('members.user', 'username email avatar')
        .lean();
    if (!group) throw new Error('Không tìm thấy nhóm');
    return group;
};

// 👉 Cập nhật API Thống Kê: Tính điểm dựa trên số Task đã hoàn thành
exports.getGroupPerformanceStats = async (groupId, userId) => {
    // 1. Kiểm tra xem user có phải Admin của nhóm không
    const group = await Group.findOne({
        _id: groupId,
        members: { $elemMatch: { user: userId, role: 'admin' } }
    });

    if (!group) {
        throw new Error("Truy cập bị từ chối. Chỉ Trưởng nhóm mới có quyền xem thống kê.");
    }

    // 2. Lấy ID các Mục tiêu (Objective) thuộc nhóm này
    const objectives = await Objective.find({ group: groupId }).select('_id');
    const objectiveIds = objectives.map(obj => obj._id);
    if (objectiveIds.length === 0) return [];

    // 3. Lấy ID các Kết quả then chốt (KeyResult) thuộc các Objective trên
    const keyResults = await KeyResult.find({ objective: { $in: objectiveIds } }).select('_id');
    const krIds = keyResults.map(kr => kr._id);
    if (krIds.length === 0) return [];

    // 4. Lấy ID các Nhiệm vụ (Task) thuộc các KeyResult trên
    const tasks = await Task.find({ keyResult: { $in: krIds } }).select('_id');
    const taskIds = tasks.map(t => t._id);
    if (taskIds.length === 0) return [];

    // 5. Thống kê số lượng Task đã hoàn thành của từng thành viên
    const stats = await Activity.aggregate([
        {
            $match: {
                entityType: 'Task',
                entityId: { $in: taskIds },
                action: 'COMPLETE_TASK' // Chỉ đếm những action chốt hạ Task
            }
        },
        {
            $group: {
                _id: "$user",
                totalCompleted: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'userInfo'
            }
        },
        { $unwind: "$userInfo" },
        {
            $project: {
                _id: 0,
                userId: "$_id",
                // Mình trả về key 'totalUpdates' để giữ UI cũ của bạn chạy được ngay lập tức 
                // mà không cần sửa code Frontend (bảng xếp hạng)
                totalUpdates: "$totalCompleted",
                username: "$userInfo.username",
                email: "$userInfo.email",
                avatar: "$userInfo.avatar"
            }
        },
        { $sort: { totalUpdates: -1 } } // Ai hoàn thành nhiều Task nhất lên top
    ]);

    return stats;
};

exports.removeMemberFromGroup = async (groupId, memberIdToRemove, requesterId) => {
    const group = await Group.findById(groupId);
    if (!group) throw new Error('Không tìm thấy nhóm');

    // 1. Kiểm tra quyền Trưởng nhóm (admin)
    const isAdmin = group.members.some(m => m.user.toString() === requesterId && m.role === 'admin');
    if (!isAdmin) throw new Error('Chỉ Trưởng nhóm mới có quyền xóa thành viên');

    // 2. Không được tự đuổi chính mình bằng API này
    if (memberIdToRemove === requesterId) throw new Error('Không thể tự xóa bản thân');

    // 3. Xóa khỏi Group
    group.members = group.members.filter(m => m.user.toString() !== memberIdToRemove);
    await group.save();

    // 4. Xóa khỏi Conversation (Phòng chat)
    await Conversation.findOneAndUpdate(
        { groupId: groupId },
        { $pull: { participants: memberIdToRemove } }
    );

    return group;
};

exports.getGroupActivities = async (groupId) => {
    // 1. Tìm các Mục tiêu (Objective) thuộc Group
    const objectives = await Objective.find({ group: groupId }).select('_id');
    const objIds = objectives.map(o => o._id);

    // 2. Tìm các KeyResult thuộc Objective
    const krs = await KeyResult.find({ objective: { $in: objIds } }).select('_id');
    const krIds = krs.map(kr => kr._id);

    // 3. Tìm các Task thuộc KeyResult
    const tasks = await Task.find({ keyResult: { $in: krIds } }).select('_id');
    const taskIds = tasks.map(t => t._id);

    // 4. Gom tất cả ID lại (Bao gồm cả ID của chính cái Group đó)
    const allEntityIds = [groupId, ...objIds, ...krIds, ...taskIds];

    // 5. Query lấy toàn bộ log liên quan đến các ID này
    const activities = await Activity.find({ entityId: { $in: allEntityIds } })
        .populate('user', 'username avatar email')
        .sort({ createdAt: -1 })
        .limit(50); // Lấy 50 hành động gần nhất

    return activities;
};