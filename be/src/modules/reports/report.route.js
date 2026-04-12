const express = require('express');
const router = express.Router();
const reportController = require('./report.controller');
const { protect } = require('../../middleware/auth.middleware');

router.get('/:groupId/report', reportController.getGroupDashboard);

module.exports = router;