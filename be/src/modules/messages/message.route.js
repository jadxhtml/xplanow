const express = require('express');
const router = express.Router();
const messageController = require('./message.controller');
const { protect } = require('../../middleware/auth.middleware');
const uploadCloud = require('../../middleware/upload.middleware');

router.get('/:groupId', protect, messageController.getGroupMessages);
router.post('/upload', protect, uploadCloud.single('file'), messageController.uploadFile);
router.post('/:messageId/react', protect, messageController.toggleReaction);

module.exports = router;