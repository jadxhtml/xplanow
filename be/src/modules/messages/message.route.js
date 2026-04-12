const express = require('express');
const router = express.Router();
const messageController = require('./message.controller');
const { protect } = require('../../middleware/auth.middleware');

router.get('/:groupId', protect, messageController.getGroupMessages);

module.exports = router;