const Objective = require('./objective.model');
const KeyResult = require('../keyResults/keyResult.model');
const Task = require('../tasks/task.model');
const activityService = require('../activities/activity.service');

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
    const objective = await Objective.create({ ...data, user: userId });
    return objective;
};

exports.deleteObjective = async (objectiveId, userId) => {
    const obj = await Objective.findOneAndDelete({ _id: objectiveId, user: userId });
    if (!obj) throw new Error('Không tìm thấy mục tiêu');

    return { message: 'Đã xóa mục tiêu thành công' };
};