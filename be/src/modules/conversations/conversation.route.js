const express = require('express');
const router = express.Router();
const conversationController = require('./conversation.controller');

const { protect } = require('../../middleware/auth.middleware');

router.post('/', protect, conversationController.createOrGetDirect);
router.get('/', protect, conversationController.getUserConversations);

module.exports = router;