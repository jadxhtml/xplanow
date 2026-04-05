const groupService = require('./group.service');

exports.createGroup = async (req, res) => {
    try {
        const group = await groupService.createGroup(req.body, req.user.id);
        res.status(201).json(group);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getUserGroups = async (req, res) => {
    try {
        const groups = await groupService.getUserGroups(req.user.id);
        res.status(200).json(groups);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.addMember = async (req, res) => {
    try {
        const { email } = req.body;
        const group = await groupService.addMemberToGroup(req.params.id, email, req.user.id);
        res.status(200).json(group);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getGroupById = async (req, res) => {
    try {
        const group = await groupService.getGroupById(req.params.id);
        res.status(200).json(group);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};