const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String
    },
    status: {
        type: String,
        enum: ['inbox', 'todo', 'doing', 'review', 'done'],
        default: 'inbox'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },

    //task phuc vu cho KeyResult nao`
    keyResult: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'KeyResult',
        default: null
    },

    //lien ket Tree
    //neu parent = 0, day la task goc
    //neu parent co id, day la task cua id do
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        default: null
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    deadline: {
        type: Date
    },
    startTime: {
        type: Date,
        default: Date.now
    },

},
    {
        timestamps: true
    });

module.exports = mongoose.model('Task', taskSchema);
