const pool = require('../config/db');
const { createNotification } = require('./notificationController');

// GET /api/admin/stats (Dashboard totals + category breakdown + recent tickets)
exports.getDashboardStats = async (req, res) => {
  try {
    const [totalRows] = await pool.query(`SELECT COUNT(*) AS total FROM complaints`);
    const [pendingRows] = await pool.query(`SELECT COUNT(*) AS pending FROM complaints WHERE status = 'Pending'`);
    const [inProgressRows] = await pool.query(`SELECT COUNT(*) AS inProgress FROM complaints WHERE status = 'In Progress'`);
    const [completedRows] = await pool.query(`SELECT COUNT(*) AS completed FROM complaints WHERE status = 'Completed'`);
    const [userRows] = await pool.query(`SELECT COUNT(*) AS userCount FROM users WHERE role = 'student'`);

    const total = totalRows[0] ? totalRows[0].total : 0;
    const pending = pendingRows[0] ? pendingRows[0].pending : 0;
    const inProgress = inProgressRows[0] ? inProgressRows[0].inProgress : 0;
    const completed = completedRows[0] ? completedRows[0].completed : 0;
    const studentCount = userRows[0] ? userRows[0].userCount : 0;

    // Category breakdown
    const [categoryBreakdown] = await pool.query(
      `SELECT category, COUNT(*) AS count FROM complaints GROUP BY category ORDER BY count DESC`
    );

    // Recent 5 complaints
    const [recent] = await pool.query(
      `SELECT c.id, c.category, c.location, c.status, c.created_at, u.full_name AS student_name
       FROM complaints c JOIN users u ON c.student_id = u.id
       ORDER BY c.created_at DESC LIMIT 5`
    );

    res.json({
      totalComplaints: total,
      pending,
      inProgress,
      completed,
      studentCount,
      categoryBreakdown: categoryBreakdown || [],
      recentComplaints: recent || []
    });
  } catch (err) {
    console.error('Error fetching admin dashboard stats:', err);
    res.status(500).json({ message: 'Server error fetching dashboard stats.' });
  }
};

// GET /api/admin/complaints (All complaints with optional ?status=&category=&search= filters)
exports.getAllComplaints = async (req, res) => {
  try {
    const { status, category, search } = req.query;
    let query = `SELECT c.*, u.full_name AS student_name, u.email AS student_email, u.department AS student_department
                 FROM complaints c
                 JOIN users u ON c.student_id = u.id WHERE 1=1`;
    const params = [];

    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }
    if (category) {
      query += ' AND c.category = ?';
      params.push(category);
    }
    if (search) {
      query += ' AND (c.description LIKE ? OR c.location LIKE ? OR c.category LIKE ? OR u.full_name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    query += ' ORDER BY c.created_at DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching complaints:', err);
    res.status(500).json({ message: 'Server error fetching complaints.' });
  }
};

// PUT /api/admin/complaints/:id (Update status / assign technician / upload resolution photo)
exports.updateComplaint = async (req, res) => {
  try {
    const { status, assignedStaff } = req.body;
    const resolutionPhotoUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const validStatuses = ['Pending', 'In Progress', 'Completed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value. Must be Pending, In Progress, or Completed.' });
    }

    const [existing] = await pool.query('SELECT * FROM complaints WHERE id = ?', [req.params.id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    const complaint = existing[0];

    await pool.query(
      `UPDATE complaints SET 
         status = COALESCE(?, status), 
         assigned_staff = COALESCE(?, assigned_staff),
         resolution_photo_url = COALESCE(?, resolution_photo_url) 
       WHERE id = ?`,
      [status || null, assignedStaff || null, resolutionPhotoUrl, req.params.id]
    );

    // Trigger Student Notification if status updated or resolved
    const newStatus = status || complaint.status;
    const statusIcon = newStatus === 'Completed' ? '✅' : (newStatus === 'In Progress' ? '🔄' : '⏳');

    await createNotification({
      userId: complaint.student_id,
      role: 'student',
      title: `${statusIcon} Complaint #${complaint.id} Updated`,
      message: `Your ${complaint.category} ticket status is now '${newStatus}'. Assigned: ${assignedStaff || complaint.assigned_staff || 'Campus Maintenance Team'}.`,
      complaintId: complaint.id
    });

    res.json({
      message: 'Complaint updated successfully.',
      status: newStatus,
      resolution_photo_url: resolutionPhotoUrl || complaint.resolution_photo_url
    });
  } catch (err) {
    console.error('Error updating complaint:', err);
    res.status(500).json({ message: 'Server error updating complaint.' });
  }
};

// ============================================
// USER MANAGEMENT MODULE
// ============================================

// GET /api/admin/users (List all registered students & admins)
exports.getUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    let query = `
      SELECT u.id, u.full_name, u.email, u.phone, u.department, u.year, u.role, u.avatar_url, u.created_at,
             COUNT(c.id) AS complaint_count
      FROM users u
      LEFT JOIN complaints c ON u.id = c.student_id
      WHERE 1=1
    `;
    const params = [];

    if (role) {
      query += ' AND u.role = ?';
      params.push(role);
    }
    if (search) {
      query += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.department LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' GROUP BY u.id ORDER BY u.created_at DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Server error fetching users.' });
  }
};

// PUT /api/admin/users/:id/role (Toggle user role between student and admin)
exports.updateUserRole = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { role } = req.body;

    if (!['student', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Role must be student or admin.' });
    }

    if (Number(targetUserId) === req.user.id && role !== 'admin') {
      return res.status(400).json({ message: 'You cannot revoke your own admin role.' });
    }

    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, targetUserId]);
    res.json({ message: `User role successfully updated to ${role}.` });
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({ message: 'Server error updating user role.' });
  }
};

// DELETE /api/admin/users/:id (Delete user account)
exports.deleteUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;

    if (Number(targetUserId) === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own admin account.' });
    }

    const [rows] = await pool.query('SELECT email FROM users WHERE id = ?', [targetUserId]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [targetUserId]);
    res.json({ message: 'User account and associated records deleted successfully.' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Server error deleting user.' });
  }
};

// ============================================
// CATEGORY MANAGEMENT MODULE
// ============================================

// GET /api/admin/categories (List all categories with live ticket count)
exports.getCategories = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT cat.*, COUNT(c.id) AS complaint_count
      FROM categories cat
      LEFT JOIN complaints c ON c.category LIKE CONCAT('%', cat.name, '%') OR cat.name LIKE CONCAT('%', c.category, '%')
      GROUP BY cat.id
      ORDER BY cat.name ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ message: 'Server error fetching categories.' });
  }
};

// POST /api/admin/categories (Add new complaint category)
exports.addCategory = async (req, res) => {
  try {
    const { name, icon, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required.' });
    }

    const [existing] = await pool.query('SELECT id FROM categories WHERE name = ?', [name.trim()]);
    if (existing && existing.length > 0) {
      return res.status(409).json({ message: 'Category already exists.' });
    }

    const [result] = await pool.query(
      'INSERT INTO categories (name, icon, description) VALUES (?, ?, ?)',
      [name.trim(), icon || '📌', description || null]
    );

    res.status(201).json({
      message: 'Category created successfully.',
      categoryId: result.insertId,
      category: { id: result.insertId, name: name.trim(), icon: icon || '📌', description }
    });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ message: 'Server error creating category.' });
  }
};

// DELETE /api/admin/categories/:id (Delete category)
exports.deleteCategory = async (req, res) => {
  try {
    const catId = req.params.id;
    await pool.query('DELETE FROM categories WHERE id = ?', [catId]);
    res.json({ message: 'Category deleted successfully.' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ message: 'Server error deleting category.' });
  }
};
