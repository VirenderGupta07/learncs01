const express = require('express');
const chatController = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/messages', chatController.getMessages);
router.get('/rooms', chatController.getMyRooms);
router.post('/rooms', chatController.findOrCreateRoom);

module.exports = router;
