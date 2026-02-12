const express = require('express');
const router = express.Router();
const bc = require('../controllers/budgetController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/', bc.getAll);
router.get('/:id', bc.getById);
router.post('/', bc.create);
router.put('/:id', bc.update);
router.delete('/:id', bc.remove);

module.exports = router;
