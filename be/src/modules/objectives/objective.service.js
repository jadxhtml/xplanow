const Objective = require('./objective.model');
const KeyResult = require('../keyResults/keyResult.model');
const Task = require('../tasks/task.model');
const Activity = require('../activities/activity.model');

//thuat toan Mega Tree
exports.getOkrTree = async (userId, groupId = null) => {
    const query = groupId ? { group: groupId } : { user: userId, group: null };


    const objectives = await Objective.find(query).lean();
    const objectiveIds = objectives.map(obj => obj._id);

    const keyResults = await KeyResult.find({ objective: { $in: objectiveIds } }).lean();
    const keyResultIds = keyResults.map(kr => kr._id);

    const tasks = await Task.find({
        $or: [
            { objective: { $in: objectiveIds } },
            { keyResult: { $in: keyResultIds } }
        ]
    }).lean();

    const taskMap = tasks.map(task => ({ ...task, itemType: 'task' }));
    const krMap = keyResults.map(kr => ({ ...kr, itemType: 'keyResult', children: [] }));
    const objMap = objectives.map(obj => ({ ...obj, itemType: 'objective', children: [] }));

    //1. gan Task con vao` Task cha
    //2. gan Task vao KeyResult
    taskMap.forEach(task => {
        if (task.keyResult) {
            const kr = krMap.find(k => k._id.toString() === task.keyResult.toString());
            if (kr) kr.children.push(task);
        } else if (task.objective) {
            const obj = objMap.find(o => o._id.toString() === task.objective.toString());
            if (obj) obj.children.push(task);
        }
    });

    //3. gan KeyResult vao Objective
    krMap.forEach(kr => {
        const obj = objMap.find(o => o._id.toString() === kr.objective.toString());
        if (obj) obj.children.push(kr);
    });

    //tra ve mang Objective chua day du thong tin
    return objMap;
};

//ham` tao muc tieu moi
exports.createObjective = async (data, userId) => {
    console.log("=== DATA TẠO MỤC TIÊU ===", data);
    const objective = await Objective.create({ ...data, user: userId, group: data.group || data.groupId || null });
    return objective;
};

exports.deleteObjective = async (objectiveId, userId) => {
    const obj = await Objective.findOneAndDelete({ _id: objectiveId, user: userId });
    if (!obj) throw new Error('Không tìm thấy mục tiêu');

    return { message: 'Đã xóa mục tiêu thành công' };
};
exports.updateProgressService = async (objectiveId, progressUpdate, userId) => {
    const objective = await Objective.findById(objectiveId);
    if (!objective) throw new Error("Không tìm thấy công việc");

    const oldValue = objective.progress;
    const newValue = progressUpdate;
    objective.progress = newValue;
    await objective.save();

    return objective;
};

exports.assignMembersService = async (objectiveId, assigneeIds, currentUserId) => {
    const objective = await Objective.findById(objectiveId);
    if (!objective) throw new Error("Không tìm thấy công việc");

    // 1. Kiểm tra quyền hạn (Bảo mật)
    // Nếu công việc thuộc về một Nhóm, kiểm tra xem user hiện tại có phải là Admin không
    if (objective.group) {
        const group = await Group.findOne({
            _id: objective.group,
            members: { $elemMatch: { user: currentUserId, role: 'admin' } }
        });

        // Nếu không phải admin nhóm VÀ cũng không phải người tạo ra công việc đó
        if (!group && objective.user.toString() !== currentUserId.toString()) {
            throw new Error("Truy cập bị từ chối. Chỉ Trưởng nhóm hoặc Người tạo mới có quyền giao việc.");
        }
    } else if (objective.user.toString() !== currentUserId.toString()) {
        // Nếu công việc cá nhân, chỉ người tạo mới được giao
        throw new Error("Bạn không có quyền chỉnh sửa công việc này.");
    }

    // 2. Cập nhật mảng người thực hiện
    objective.assignees = assigneeIds;
    await objective.save();

    // 3. Ghi Log hoạt động: "Ai đó đã giao việc này cho X người"
    await Activity.create({
        user: currentUserId,
        action: 'ASSIGN_MEMBERS',
        entityType: 'Objective',
        entityId: objective._id,
        details: `Đã giao công việc này cho ${assigneeIds.length} thành viên`
    });

    // Populate để trả về thông tin User chi tiết thay vì chỉ trả về ID
    return await Objective.findById(objectiveId).populate('assignees', 'username email avatar');
};