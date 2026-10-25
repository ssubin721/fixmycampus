const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fixmycampus_super_secret_key_2026';

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register  (student sign up)
exports.register = async (req, res) => {
  try {
    const { fullName, email, phone, department, year, password, confirmPassword } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Full name, email, and password are required.' });
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, phone, department, year, password_hash, role)
       VALUES (?, ?, ?, ?, ?, ?, 'student')`,
      [fullName, email, phone || null, department || null, year || null, passwordHash]
    );

    const user = {
      id: result.insertId,
      full_name: fullName,
      email,
      role: 'student'
    };
    const token = signToken(user);
    res.status(201).json({ message: 'Account created successfully.', token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
};

// POST /api/auth/login  (student or admin)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user);
    delete user.password_hash;
    res.json({ message: 'Login successful.', token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

// POST /api/auth/admin-login (kept separate for the dedicated Admin Login screen)
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, 'admin']);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid admin credentials.' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid admin credentials.' });
    }
    const token = signToken(user);
    delete user.password_hash;
    res.json({ message: 'Admin login successful.', token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during admin login.' });
  }
};

// GET /api/auth/profile
exports.getProfile = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, full_name, email, phone, department, year, role, avatar_url FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching profile.' });
  }
};

// PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, phone, department, year } = req.body;
    const avatarUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    if (avatarUrl) {
      await pool.query(
        `UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), department = COALESCE(?, department), year = COALESCE(?, year), avatar_url = ? WHERE id = ?`,
        [fullName || null, phone || null, department || null, year || null, avatarUrl, req.user.id]
      );
    } else {
      await pool.query(
        `UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), department = COALESCE(?, department), year = COALESCE(?, year) WHERE id = ?`,
        [fullName || null, phone || null, department || null, year || null, req.user.id]
      );
    }

    const [rows] = await pool.query('SELECT id, full_name, email, phone, department, year, role, avatar_url FROM users WHERE id = ?', [req.user.id]);
    res.json({ message: 'Profile updated successfully.', user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating profile.' });
  }
};
