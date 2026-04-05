const express = require('express');
const router = express.Router();
const activityController = require('./activity.controller');
const { protect } = require('../../middleware/auth.middleware');

router.use(protect);

router.get('/', activityController.getUserActivities);

module.exports = router;