const express = require('express');
const router = express.Router();
const gc = require('../controllers/groupController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/', gc.getAll);
router.get('/:id', gc.getById);
router.post('/', gc.create);
router.post('/:id/transactions', gc.addTransaction);
router.post('/:id/members', gc.addMember);

module.exports = router;
