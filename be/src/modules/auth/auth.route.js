const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/google', authController.googleLogin);
router.post('/refresh', authController.refreshToken);

module.exports = router;