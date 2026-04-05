const express = require('express');
const router = express.Router();
const userController = require('./user.controller');

const { protect } = require('../../middleware/auth.middleware');

router.get('/search', protect, userController.searchUsers);

module.exports = router;