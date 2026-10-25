const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/admin-login', authController.adminLogin);
router.get('/profile', verifyToken, authController.getProfile);
router.put('/profile', verifyToken, upload.single('avatar'), authController.updateProfile);

module.exports = router;

