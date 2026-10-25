const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Admin-only middleware guard
router.use(verifyToken, requireAdmin);

// Dashboard & Complaints
router.get('/stats', adminController.getDashboardStats);
router.get('/complaints', adminController.getAllComplaints);
router.put('/complaints/:id', upload.single('resolutionPhoto'), adminController.updateComplaint);

// User Management
router.get('/users', adminController.getUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

// Category Management
router.get('/categories', adminController.getCategories);
router.post('/categories', adminController.addCategory);
router.delete('/categories/:id', adminController.deleteCategory);

module.exports = router;
