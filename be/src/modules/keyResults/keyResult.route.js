const express = require('express');
const router = express.Router();
const keyResultController = require('./keyResult.controller');
const { protect } = require('../../middleware/auth.middleware');
const { isGroupAdmin } = require('../../middleware/auth.middleware');

router.use(protect); // bat buoc dang nhap

router.post('/', isGroupAdmin, keyResultController.createKeyResult);
router.put('/:id', isGroupAdmin, keyResultController.updateKeyResult);
router.delete('/:id', isGroupAdmin, keyResultController.deleteKeyResult);

module.exports = router;