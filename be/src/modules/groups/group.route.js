const express = require('express');
const router = express.Router();
const groupController = require('./group.controller');
const { protect } = require('../../middleware/auth.middleware');

router.use(protect);

router.post('/', groupController.createGroup);
router.get('/user', groupController.getUserGroups);
router.get('/:id', groupController.getGroupById);
router.post('/:id/members', groupController.inviteMember);
router.get('/:groupId/performance', protect, groupController.getPerformance);
router.delete('/:id/members/:memberId', protect, groupController.removeMember);
router.delete('/:groupId/leave', protect, groupController.leaveGroup);

module.exports = router;