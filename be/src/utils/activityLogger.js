const Activity = require('../modules/activities/activity.model');

const logActivity = async (userId, action, entityType, details) => {
    try {
        await Activity.create({
            user: userId,
            action,
            entityType,
            details,
        });
    } catch (err) { console.error("Lỗi ghi log:", err); }
};
module.exports = logActivity;