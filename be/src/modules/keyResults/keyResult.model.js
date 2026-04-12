const mongoose = require('mongoose');

const keyResultSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    targetValue: {
        type: Number,
        required: true
    },
    currentValue: {
        type: Number,
        default: 0
    },
    unit: {
        type: String,
        default: "%",
    },
    objective: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Objective',
        required: true
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
    deadline: {
        type: Date
    },
    assignee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

}, {
    timestamps: true
});

module.exports = mongoose.model('KeyResult', keyResultSchema);