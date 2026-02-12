const express = require('express');
const router = express.Router();
const cc = require('../controllers/chatController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/sessions', cc.getSessions);
router.post('/sessions', cc.createSession);
router.get('/sessions/:id/messages', cc.getMessages);
router.post('/message', cc.sendMessage);

module.exports = router;
