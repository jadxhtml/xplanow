const Objective = require('../objectives/objective.model');
const KeyResult = require('../keyResults/keyResult.model');
const Task = require('../tasks/task.model');
const Group = require('../groups/group.model');

exports.getGroupDashboard = async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await Group.findById(groupId).populate('members.user', 'username');
        if (!group) return res.status(404).json({ message: "Không tìm thấy nhóm" });

        const userStatsMap = {};
        group.members.forEach(member => {
            if (member.user) {
                userStatsMap[member.user._id.toString()] = {
                    name: member.user.username,
                    totalTasks: 0,
                    doneTasks: 0
                };
            }
        });

        const objectives = await Objective.find({ group: groupId });
        const objIds = objectives.map(obj => obj._id);

        const keyResults = await KeyResult.find({ objective: { $in: objIds } });
        const krIds = keyResults.map(kr => kr._id);

        const tasks = await Task.find({ keyResult: { $in: krIds } });

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'done').length;
        const inProgressTasks = tasks.filter(t => ['inbox', 'todo', 'doing', 'review'].includes(t.status)).length;

        const now = new Date();
        const overdueTasks = tasks.filter(t =>
            t.deadline && new Date(t.deadline) < now && t.status !== 'done'
        ).length;

        tasks.forEach(task => {
            if (!task.user) return;
            const userIdStr = task.user.toString();

            if (userStatsMap[userIdStr]) {
                userStatsMap[userIdStr].totalTasks += 1;
                if (task.status === 'done') {
                    userStatsMap[userIdStr].doneTasks += 1;
                }
            }
        });

        const memberChartData = Object.values(userStatsMap);

        res.status(200).json({
            overview: {
                totalTasks,
                completedTasks,
                inProgressTasks,
                overdueTasks,
            },
            memberChartData
        });

    } catch (error) {
        console.error("Lỗi lấy báo cáo:", error);
        res.status(500).json({ message: "Lỗi Server khi tạo báo cáo" });
    }
};