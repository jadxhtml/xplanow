const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');
const { protect } = require('../../middleware/auth.middleware');

router.get('/', protect, notificationController.getMyNotifications);
router.put('/read-all', protect, notificationController.markAsRead);
router.post('/respond', protect, notificationController.respondToInvite);

module.exports = router;