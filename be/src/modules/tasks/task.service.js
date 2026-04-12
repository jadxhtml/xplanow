const Task = require('./task.model');

// Lấy danh sách và tạo Tree
exports.getTaskTree = async (userId) => {
    // 💡 LƯU Ý CHO GIAI ĐOẠN TỚI: 
    // Hiện tại hàm này đang lọc task theo người tạo ({ user: userId }).
    // Để mọi người trong nhóm cùng thấy task của nhau, sau này bạn nên đổi tham số
    // truyền vào thành `keyResultId` hoặc `groupId` và query: Task.find({ keyResult: keyResultId })

    const tasks = await Task.find({ user: userId }).lean(); // dùng .lean() để biến Document thành Object JS thuần
    const taskMap = {};
    const tree = [];

    // cho tất cả task vào Map và thêm mảng children rỗng
    tasks.forEach(task => {
        taskMap[task._id.toString()] = { ...task, children: [] };
    });

    // lắp ghép cha-con
    tasks.forEach(task => {
        // nếu có cha, nhét vào children của cha
        if (task.parent) {
            const parentId = task.parent.toString();
            if (taskMap[parentId]) {
                taskMap[parentId].children.push(taskMap[task._id.toString()]);
            }
        } else {
            // parent == null, nó là Root
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
    return task;
};

// Cập nhật task (👉 Đã gỡ rào cản người dùng)
exports.updateTask = async (taskId, updateData, userId) => {
    const task = await Task.findOneAndUpdate(
        { _id: taskId }, // Bỏ điều kiện `user: userId` để ai cũng sửa được
        updateData,
        { new: true } // trả về data mới nhất sau khi update
    );
    if (!task) throw new Error('Không tìm thấy công việc');
    return task;
};

// Xóa task (👉 Đã gỡ rào cản người dùng)
exports.deleteTask = async (taskId, userId) => {
    const task = await Task.findOne({ _id: taskId }); // Bỏ điều kiện `user: userId`
    if (!task) throw new Error("Không tìm thấy công việc");

    // xóa cha
    await Task.deleteOne({ _id: taskId });
    // xóa các task có parent là cha (xóa con)
    await Task.deleteMany({ parent: taskId });

    return { message: "Đã xóa công việc và các công việc con trực tiếp" };
};