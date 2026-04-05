const express = require('express');
const router = express.Router();
const groupController = require('./group.controller');
const { protect } = require('../../middleware/auth.middleware');

router.use(protect);

router.post('/', groupController.createGroup);
router.get('/', groupController.getUserGroups);
router.get('/:id', groupController.getGroupById);
router.post('/:id/members', groupController.addMember);

module.exports = router;