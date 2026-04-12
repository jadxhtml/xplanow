const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    // user thuc hien
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Hanh dong la gi
    action: { type: String, required: true },
    // Tac dong len cai gi
    entityType: { type: String, required: true },
    // id cua thu' tac dong len
    entityId: { type: mongoose.Schema.Types.ObjectId },
    // mo ta?
    details: { type: String, },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: false }
}, {
    timestamps: true
});

module.exports = mongoose.model('Activity', activitySchema);