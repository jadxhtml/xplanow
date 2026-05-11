const express = require('express');
const router = express.Router();
const objectiveController = require('./objective.controller');
const { protect } = require('../../middleware/auth.middleware');
const { isGroupAdmin } = require('../../middleware/auth.middleware');

router.use(protect);

router.get('/tree', objectiveController.getOkrTree);
router.post('/', isGroupAdmin, objectiveController.createObjective);
router.put('/:id', isGroupAdmin, objectiveController.updateObjective);
router.delete('/:id', isGroupAdmin, objectiveController.deleteObjective);
router.put('/:id/assign', protect, objectiveController.assignMembers);

module.exports = router;