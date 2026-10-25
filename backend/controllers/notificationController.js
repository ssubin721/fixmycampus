const pool = require('../config/db');

// Helper to ensure notifications table exists (graceful auto-create if DB not migrated yet)
const ensureNotificationsTable = async () => {
  try {
    if (pool.mode === 'sqlite') {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER DEFAULT NULL,
          role TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          complaint_id INTEGER DEFAULT NULL,
          is_read INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT DEFAULT NULL,
          role VARCHAR(20) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          complaint_id INT DEFAULT NULL,
          is_read TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
  } catch (err) {
    console.error('Error auto-creating notifications table:', err);
  }
};

// GET /api/notifications  (get user's notifications)
exports.getNotifications = async (req, res) => {
  try {
    await ensureNotificationsTable();
    const userId = req.user.id;
    const role = req.user.role;

    let query, params;
    if (role === 'admin') {
      // Admins see notifications targeted to role = 'admin' or user_id = userId
      query = `SELECT * FROM notifications WHERE role = 'admin' OR user_id = ? ORDER BY created_at DESC LIMIT 20`;
      params = [userId];
    } else {
      // Students see notifications targeted to their user_id
      query = `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`;
      params = [userId];
    }

    const [rows] = await pool.query(query, params);
    const unreadCount = rows.filter(n => !n.is_read).length;

    res.json({
      unreadCount,
      notifications: rows
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Server error fetching notifications.' });
  }
};

// PUT /api/notifications/read  (mark all notifications as read)
exports.markAsRead = async (req, res) => {
  try {
    await ensureNotificationsTable();
    const userId = req.user.id;
    const role = req.user.role;

    if (role === 'admin') {
      await pool.query(`UPDATE notifications SET is_read = 1 WHERE role = 'admin' OR user_id = ?`, [userId]);
    } else {
      await pool.query(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [userId]);
    }

    res.json({ message: 'Notifications marked as read.' });
  } catch (err) {
    console.error('Error marking notifications as read:', err);
    res.status(500).json({ message: 'Server error updating notifications.' });
  }
};

// PUT /api/notifications/:id/read  (mark a single notification as read when clicked)
exports.markSingleAsRead = async (req, res) => {
  try {
    await ensureNotificationsTable();
    const id = req.params.id;
    await pool.query(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [id]);
    res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Error marking single notification as read:', err);
    res.status(500).json({ message: 'Server error updating notification.' });
  }
};

// Helper function to create notification internally from controllers
exports.createNotification = async ({ userId, role, title, message, complaintId }) => {
  try {
    await ensureNotificationsTable();
    await pool.query(
      `INSERT INTO notifications (user_id, role, title, message, complaint_id) VALUES (?, ?, ?, ?, ?)`,
      [userId || null, role, title, message, complaintId || null]
    );
  } catch (err) {
    console.error('Error creating notification helper:', err);
  }
};
