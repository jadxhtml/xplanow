const Objective = require('../objectives/objective.model');
const KeyResult = require('../keyResults/keyResult.model');
const Task = require('../tasks/task.model');
const Group = require('../groups/group.model');

exports.getGroupDashboard = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { startDate, endDate } = req.query;

        // 1. Lấy thông tin nhóm và khởi tạo Map thành viên
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

        // 2. Gom toàn bộ ID của Objective và KeyResult trong Nhóm
        const objectives = await Objective.find({ group: groupId });
        const objIds = objectives.map(obj => obj._id);

        const keyResults = await KeyResult.find({ objective: { $in: objIds } });
        const krIds = keyResults.map(kr => kr._id);

        // 👉 SỬA LỖI LỌT SỔ: Tìm Task thuộc về Objective HOẶC KeyResult
        let baseTaskQuery = {
            $or: [
                { objective: { $in: objIds } },
                { keyResult: { $in: krIds } }
            ]
        };

        // Kẹp thêm điều kiện lọc thời gian (nếu có)
        let finalQuery = baseTaskQuery;
        if (startDate && endDate) {
            finalQuery = {
                $and: [
                    baseTaskQuery,
                    {
                        createdAt: {
                            $gte: new Date(startDate),
                            $lte: new Date(endDate)
                        }
                    }
                ]
            };
        }

        const allTasks = await Task.find(finalQuery);

        // 👉 SỬA LỖI ĐẾM LẶP: Lọc lấy các Task "Lá" (Giống hệt logic của Kanban)
        // B1: Quét toàn bộ danh sách để tìm ra những ID đang được làm Cha (có người gọi là parent)
        const parentIds = new Set(allTasks.map(t => t.parent ? t.parent.toString() : null).filter(Boolean));

        // B2: Chỉ giữ lại những Task KHÔNG làm Cha (những Task ở tầng cuối cùng)
        const leafTasks = allTasks.filter(t => !parentIds.has(t._id.toString()));

        // 3. BẮT ĐẦU TÍNH TOÁN DỰA TRÊN LEAF TASKS (Số liệu sẽ khớp 100% với Kanban)
        const totalTasks = leafTasks.length;
        const completedTasks = leafTasks.filter(t => t.status === 'done').length;
        const inProgressTasks = leafTasks.filter(t => ['inbox', 'todo', 'doing', 'review'].includes(t.status)).length;

        const now = new Date();
        const overdueTasks = leafTasks.filter(t =>
            t.deadline && new Date(t.deadline) < now && t.status !== 'done'
        ).length;

        // 4. TÍNH TOÁN BIỂU ĐỒ THÀNH VIÊN
        leafTasks.forEach(task => {
            // Chỉ lấy người được giao (assignee) để đồng bộ với logic Kanban mới sửa
            const personInCharge = task.assignee;
            if (!personInCharge) return;

            const userIdStr = personInCharge.toString();

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