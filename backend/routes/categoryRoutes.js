const express = require('express');
const router = express.Router();
const cc = require('../controllers/categoryController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/', cc.getAll);
router.post('/', cc.create);
router.put('/:id', cc.update);
router.delete('/:id', cc.remove);

module.exports = router;
