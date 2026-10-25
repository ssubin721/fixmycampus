const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { verifyToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Available categories (can be viewed by authenticated users or students)
router.get('/categories', verifyToken, complaintController.getCategories);

router.post('/', verifyToken, upload.single('photo'), complaintController.createComplaint);
router.get('/my', verifyToken, complaintController.getMyComplaints);
router.get('/stats/summary', verifyToken, complaintController.getMyStats);
router.get('/:id', verifyToken, complaintController.getComplaintById);

module.exports = router;
