const pool = require('../config/db');
const { createNotification } = require('./notificationController');

// POST /api/complaints (student reports a new complaint)
exports.createComplaint = async (req, res) => {
  try {
    const { category, description, location } = req.body;
    if (!category || !description) {
      return res.status(400).json({ message: 'Category and description are required.' });
    }
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await pool.query(
      `INSERT INTO complaints (student_id, category, description, location, photo_url, status)
       VALUES (?, ?, ?, ?, ?, 'Pending')`,
      [req.user.id, category, description, location || null, photoUrl]
    );

    const complaintId = result.insertId;

    // Trigger Admin Notification
    await createNotification({
      role: 'admin',
      title: '🚨 New Complaint Reported',
      message: `Student ${req.user.full_name || 'User'} filed a new ${category} complaint at ${location || 'Campus'}.`,
      complaintId
    });

    res.status(201).json({ message: 'Complaint submitted successfully.', complaintId });
  } catch (err) {
    console.error('Error creating complaint:', err);
    res.status(500).json({ message: 'Server error submitting complaint.' });
  }
};

// GET /api/complaints/my (student's own complaints)
exports.getMyComplaints = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM complaints WHERE student_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching student complaints:', err);
    res.status(500).json({ message: 'Server error fetching complaints.' });
  }
};

// GET /api/complaints/:id (Complaint Details screen)
exports.getComplaintById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, u.full_name AS student_name, u.department
       FROM complaints c JOIN users u ON c.student_id = u.id
       WHERE c.id = ?`,
      [req.params.id]
    );
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Complaint not found.' });

    // Students may only view their own complaint; admins can view any
    const complaint = rows[0];
    if (req.user.role !== 'admin' && complaint.student_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this complaint.' });
    }
    res.json(complaint);
  } catch (err) {
    console.error('Error fetching complaint details:', err);
    res.status(500).json({ message: 'Server error fetching complaint.' });
  }
};

// GET /api/complaints/stats/summary (quick counts for student home)
exports.getMyStats = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT status, COUNT(*) AS count FROM complaints WHERE student_id = ? GROUP BY status`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching student stats:', err);
    res.status(500).json({ message: 'Server error fetching stats.' });
  }
};

// GET /api/complaints/categories (available categories for reporting)
exports.getCategories = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ message: 'Server error fetching categories.' });
  }
};
