const activityService = require('./activity.service');

exports.getUserActivities = async (req, res) => {
    try {
        //lay 50 log gan nhat cua tai khoan dang dang nhap
        const activities = await activityService.getUserActivities(req.user.id);
        res.status(200).json(activities);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};