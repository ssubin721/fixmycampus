-- FixMyCampus Production Database Schema
-- Compatible with MySQL 8.0+ and MariaDB
-- Default admin credentials:
-- Email: admin@fixmycampus.com
-- Password: admin123

CREATE DATABASE IF NOT EXISTS fixmycampus;
USE fixmycampus;

-- ============================================
-- 1. USERS TABLE (students & campus admins)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20) DEFAULT NULL,
  department VARCHAR(100) DEFAULT NULL,
  year VARCHAR(50) DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
  avatar_url VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
);

-- ============================================
-- 2. CATEGORIES TABLE (Campus issue categories)
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(20) NOT NULL DEFAULT '📌',
  description VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. COMPLAINTS TABLE (Reported campus issues)
-- ============================================
CREATE TABLE IF NOT EXISTS complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255) DEFAULT NULL,
  photo_url VARCHAR(255) DEFAULT NULL,
  resolution_photo_url VARCHAR(255) DEFAULT NULL,
  status ENUM('Pending', 'In Progress', 'Completed') NOT NULL DEFAULT 'Pending',
  assigned_staff VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_complaints_student (student_id),
  INDEX idx_complaints_status (status),
  INDEX idx_complaints_category (category),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- 4. NOTIFICATIONS TABLE (Student & admin alerts)
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  role ENUM('student', 'admin') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  complaint_id INT DEFAULT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_role (role)
);

-- ============================================
-- SEED DATA: Default Admin Account
-- Default login: admin@fixmycampus.com / admin123
-- ============================================
INSERT INTO users (full_name, email, phone, department, year, password_hash, role)
VALUES (
  'Campus Administrator',
  'admin@fixmycampus.com',
  '0000000000',
  'Campus Infrastructure Administration',
  'Admin',
  '$2b$10$hWIVq/N8h72W5ewWQybR.esmTzWF8s7OA2K3GJthKXL2V4bNEk7Ka',
  'admin'
) ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

-- ============================================
-- SEED DATA: Default Campus Issue Categories
-- ============================================
INSERT INTO categories (name, icon, description) VALUES
('Plumbing & Water', '🚰', 'Leaks, pipe damage, taps, and water supply issues'),
('Electrical & Lights', '💡', 'Wiring, sockets, lighting, fans, and power cuts'),
('Sanitation & Hygiene', '🧹', 'Washrooms, dustbins, cleaning, and waste management'),
('Internet & Wi-Fi', '📶', 'Campus Wi-Fi connectivity, speed, and LAN drops'),
('Steel Materials & Metal', '⚙️', 'Metal gates, window grills, stair handrails, and door locks'),
('Furniture & Civil', '🪑', 'Desks, benches, chairs, wall plaster, and broken tiles'),
('Gardens & Landscaping', '🌳', 'Overgrown vegetation, walking pathways, and tree branches'),
('Security & Other', '🛡️', 'Locks, boundary fencing, lighting in dark areas, and safety concerns')
ON DUPLICATE KEY UPDATE icon = VALUES(icon);
