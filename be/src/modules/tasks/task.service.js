const Task = require('./task.model');

//tinh toan phan tram subtask
//de quy tinh tu duoi len (bottom-up)
const calculateAndUpdateParentStatus = async (parentId) => {
    if (!parentId) return;
    const childTasks = await Task.find({ parent: parentId });
    if (childTasks.length === 0) {
        await Task.findByIdAndUpdate(parentId, { status: 'todo', progress: 0 });
        return;
    }

    const totalChildren = childTasks.length;
    const doneChildren = childTasks.filter(t => t.status === 'done').length;
    const progress = Math.round((doneChildren / totalChildren) * 100);

    let newStatus = 'todo';
    if (progress === 100) {
        newStatus = 'done';
    } else if (progress > 0) {
        newStatus = 'doing';
    }

    // 4. Cập nhật Task Cha trong Database
    const parentTask = await Task.findByIdAndUpdate(
        parentId,
        { status: newStatus, progress: progress },
        { new: true }
    );

    if (parentTask && parentTask.parent) {
        await calculateAndUpdateParentStatus(parentTask.parent);
    } else if (parentTask && parentTask.keyResult) {

    }
};
// ============================================================================
//de quy tinh tu tren xuong (top-down)
const cascadeUpdateStatus = async (parentId, newStatus) => {
    // Tìm tất cả các con trực tiếp
    const children = await Task.find({ parent: parentId });
    if (children.length === 0) return;

    // Tính toán % tiến độ tương ứng với trạng thái mới
    let newProgress = 0;
    if (newStatus === 'done') newProgress = 100;
    else if (newStatus === 'doing') newProgress = 50; // Hoặc giữ nguyên tiến độ cũ tùy bạn

    for (const child of children) {
        // Cập nhật con
        await Task.findByIdAndUpdate(child._id, {
            status: newStatus,
            progress: newStatus === 'done' ? 100 : (newStatus === 'todo' ? 0 : child.progress)
        });

        // Đệ quy: Tiếp tục ép các cháu, chắt... đổi trạng thái theo
        await cascadeUpdateStatus(child._id, newStatus);
    }
};


// Lấy danh sách và tạo Tree
exports.getTaskTree = async (userId) => {
    const tasks = await Task.find({ user: userId }).lean();
    const taskMap = {};
    const tree = [];

    tasks.forEach(task => {
        taskMap[task._id.toString()] = { ...task, children: [] };
    });

    tasks.forEach(task => {
        if (task.parent) {
            const parentId = task.parent.toString();
            if (taskMap[parentId]) {
                taskMap[parentId].children.push(taskMap[task._id.toString()]);
            }
        } else {
            tree.push(taskMap[task._id.toString()]);
        }
    });
    return tree;
};

// Tạo Task mới
exports.createTask = async (taskData, userId) => {
    if (taskData.parent && !taskData.keyResult) {
        const parentTask = await Task.findById(taskData.parent);
        if (parentTask && parentTask.keyResult) {
            taskData.keyResult = parentTask.keyResult;
        }
    }
    const task = await Task.create({ ...taskData, user: userId });

    // 👉 Tự động kéo tiến độ của Cha xuống khi đẻ thêm một đứa con mới (mẫu số tăng lên)
    if (task.parent) {
        await calculateAndUpdateParentStatus(task.parent);
    }

    return task;
};

// Cập nhật task
exports.updateTask = async (taskId, updateData, userId) => {
    const task = await Task.findOneAndUpdate(
        { _id: taskId },
        updateData,
        { new: true }
    );
    if (!task) throw new Error('Không tìm thấy công việc');

    // Nếu người dùng có thao tác kéo thả đổi Cột trạng thái (status)
    if (updateData.status !== undefined) {
        // 👉 Phản ứng 1 (Top-down): Ép tất cả task con đổi theo Cha
        await cascadeUpdateStatus(taskId, updateData.status);

        // 👉 Phản ứng 2 (Bottom-up): Báo cáo lên Ông nội (nếu Task này có Cha)
        if (task.parent) {
            await calculateAndUpdateParentStatus(task.parent);
        }
    }

    return task;
};

// Xóa task
exports.deleteTask = async (taskId, userId) => {
    const task = await Task.findOne({ _id: taskId });
    if (!task) throw new Error("Không tìm thấy công việc");

    const parentId = task.parent; // Lưu lại ID cha trước khi xóa

    // xóa cha
    await Task.deleteOne({ _id: taskId });
    // xóa các task có parent là cha (xóa con)
    await Task.deleteMany({ parent: taskId });

    // 👉 Nếu xóa 1 task con, tiến độ của Cha phải được tính lại (vì mẫu số giảm đi)
    if (parentId) {
        await calculateAndUpdateParentStatus(parentId);
    }

    return { message: "Đã xóa công việc và các công việc con trực tiếp" };
};