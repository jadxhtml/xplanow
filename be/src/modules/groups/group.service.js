const Group = require('./group.model');
const User = require('../users/user.model');
const Conversation = require('../conversations/conversation.model');

//tao nhom moi (nguoi tao la` admin)
exports.createGroup = async (groupData, creatorId) => {
    const group = await Group.create({
        ...groupData,
        members: [{ user: creatorId, role: 'admin' }]
    });
    await Conversation.create({
        name: group.name,
        type: 'group',
        participants: [creatorId],
        groupId: group._id
    });
    return group;
};

//lay danh sach cac nhom ma` User dang tham gia
exports.getUserGroups = async (userId) => {
    return await Group.find({ 'members.user': userId })
        .populate('members.user', 'username email')
        .lean();
};

// them thanh vien vao nhom
exports.addMemberToGroup = async (groupId, email, requesterId) => {
    const group = await Group.findById(groupId);
    if (!group) throw new Error('Không tìm thấy nhóm');

    const isAdmin = group.members.some(m => m.user.toString() === requesterId && m.role === 'admin');
    if (!isAdmin) throw new Error('Chỉ Admin mới có quyền thêm thành viên');

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) throw new Error('Không tìm thấy tài khoản với email này');

    const isAlreadyMember = group.members.some(m => m.user.toString() === userToAdd._id.toString());
    if (isAlreadyMember) throw new Error('Người dùng này đã ở trong nhóm');

    group.members.push({ user: userToAdd._id, role: 'member' });
    await group.save();

    await Conversation.findOneAndUpdate(
        { groupId: groupId },
        { $addToSet: { participants: userToAdd._id } }
    );

    return group;
};

//luu thong tin chi tiet nhom
exports.getGroupById = async (groupId) => {
    const group = await Group.findById(groupId)
        .populate('members.user', 'username email avatar')
        .lean();
    if (!group) throw new Error('Không tìm thấy nhóm');
    return group;
};