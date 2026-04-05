const mongoose = require('mongoose');

const objectiveSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    type: {
        type: String,
        enum: ['company', 'personal'],
        default: 'personal'
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        // required: true
    },
    progress: {
        type: Number,
        default: 0
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        default: null
    },
    deadline: {
        type: Date
    }
}, {
    timestamps: true
});


module.exports = mongoose.model('Objective', objectiveSchema)