const Task = require('./task.model');

//lay danh sach va tao. Tree
exports.getTaskTree = async (userId) => {
    //lay task cua User
    const tasks = await Task.find({ user: userId }).lean(); // dung .lean() de bien Document thanh Object JS thuan`
    const taskMap = {};
    const tree = [];

    //cho tat ca task va Map va them mang Chilren rong~
    tasks.forEach(task => {
        taskMap[task._id.toString()] = { ...task, children: [] };
    });

    //lap ghep cha-con
    tasks.forEach(task => {
        //neu co cha, nhet vao Chilren cua cha
        if (task.parent) {
            const parentId = task.parent.toString();
            if (taskMap[parentId]) {
                taskMap[parentId].children.push(taskMap[task._id.toString()])
            }
        } else {
            //parent == null, no la Root
            tree.push(taskMap[task._id.toString()])
        }
    });
    return tree;
};

//tao Task moi
exports.createTask = async (taskData, userId) => {
    if (taskData.parent && !taskData.keyResult) {
        const parentTask = await Task.findById(taskData.parent);
        if (parentTask && parentTask.keyResult) {
            taskData.keyResult = parentTask.keyResult
        }
    }
    const task = await Task.create({ ...taskData, user: userId });
    return task
}

//cap nhat task
exports.updateTask = async (taskId, updateData, userId) => {
    const task = await Task.findOneAndUpdate({
        _id: taskId,
        user: userId
    }, updateData, {
        new: true // tra ve data moi nhat sau khi update
    });
    if (!task) throw new Error('Không tìm thấy công việc');
    return task;
};

//xoa task
exports.deleteTask = async (taskId, userId) => {
    const task = await Task.findOne({ _id: taskId, user: userId });
    if (!task) throw new Error("Không tìm thấy công việc");

    //xoa cha
    await Task.deleteOne({ _id: taskId });
    //xoa ca task co parent la cha
    await Task.deleteMany({ parent: taskId })

    return { message: "Đã xóa công việc và các công việc con trực tiếp" }
}