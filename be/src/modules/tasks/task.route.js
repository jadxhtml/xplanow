const express = require('express');
const router = express.Router();
const taskController = require('./task.controller');
const { protect } = require('../../middleware/auth.middleware');
const { isGroupAdmin } = require('../../middleware/auth.middleware');

router.use(protect);

router.get('/', taskController.getTask);
router.post('/', isGroupAdmin, taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', isGroupAdmin, taskController.deleteTask);
router.post('/ai-generate', protect, taskController.generateTasksByAI);
router.post('/ai-save', protect, taskController.saveAITasks);



module.exports = router;