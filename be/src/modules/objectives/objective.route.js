const express = require('express');
const router = express.Router();
const objectiveController = require('./objective.controller');
const { protect } = require('../../middleware/auth.middleware');

router.use(protect);

router.get('/tree', objectiveController.getOkrTree);
router.post('/', objectiveController.createObjective);
router.put('/:id', objectiveController.updateObjective);
router.delete('/:id', objectiveController.deleteObjective);

module.exports = router;