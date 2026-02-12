const express = require('express');
const router = express.Router();
const tc = require('../controllers/transactionController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/', tc.getAll);
router.get('/:id', tc.getById);
router.post('/', tc.create);
router.put('/:id', tc.update);
router.delete('/:id', tc.remove);

module.exports = router;
