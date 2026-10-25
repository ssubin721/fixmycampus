const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, notificationController.getNotifications);
router.put('/read', verifyToken, notificationController.markAsRead);
router.put('/:id/read', verifyToken, notificationController.markSingleAsRead);

module.exports = router;
