const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    name: { type: String },

    //phan loai chat 1-1 hoac nhom chat
    type: { type: String, enum: ['direct', 'group'], default: 'direct' },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }
}, { timestamps: true });

module.exports = mongoose.model('Conversation', conversationSchema);