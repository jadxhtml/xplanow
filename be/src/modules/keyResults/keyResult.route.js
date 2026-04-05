const express = require('express');
const router = express.Router();
const keyResultController = require('./keyResult.controller');
const { protect } = require('../../middleware/auth.middleware');

router.use(protect); // bat buoc dang nhap

router.post('/', keyResultController.createKeyResult);
router.put('/:id', keyResultController.updateKeyResult);
router.delete('/:id', keyResultController.deleteKeyResult);

module.exports = router;