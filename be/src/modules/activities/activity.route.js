const express = require('express');
const router = express.Router();
const activityController = require('./activity.controller');
const { protect } = require('../../middleware/auth.middleware');

router.use(protect);

router.get('/', protect, activityController.getActivities);

module.exports = router;