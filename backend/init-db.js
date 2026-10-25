const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const ADMIN_PASSWORD_HASH = '$2b$10$hWIVq/N8h72W5ewWQybR.esmTzWF8s7OA2K3GJthKXL2V4bNEk7Ka'; // admin123

const DEFAULT_CATEGORIES = [
  { name: 'Plumbing & Water', icon: '🚰', desc: 'Leaks, pipe damage, taps, and water supply issues' },
  { name: 'Electrical & Lights', icon: '💡', desc: 'Wiring, sockets, lighting, fans, and power cuts' },
  { name: 'Sanitation & Hygiene', icon: '🧹', desc: 'Washrooms, dustbins, cleaning, and waste management' },
  { name: 'Internet & Wi-Fi', icon: '📶', desc: 'Campus Wi-Fi connectivity, speed, and LAN drops' },
  { name: 'Steel Materials & Metal', icon: '⚙️', desc: 'Metal gates, window grills, stair handrails, and door locks' },
  { name: 'Furniture & Civil', icon: '🪑', desc: 'Desks, benches, chairs, wall plaster, and broken tiles' },
  { name: 'Gardens & Landscaping', icon: '🌳', desc: 'Overgrown vegetation, walking pathways, and tree branches' },
  { name: 'Security & Other', icon: '🛡️', desc: 'Locks, boundary fencing, lighting in dark areas, and safety concerns' }
];

async function initializeDatabase() {
  console.log('============================================================');
  console.log('🚀 FixMyCampus Database Initializer');
  console.log('============================================================');

  const host = (process.env.DB_HOST || 'localhost').trim();
  const port = Number(process.env.DB_PORT) || 3306;
  const user = (process.env.DB_USER || 'root').trim();
  const password = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD.trim() : '';
  const database = (process.env.DB_NAME || 'fixmycampus').trim();
  const useSsl = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';

  console.log(`📡 Target Host: ${host}:${port}`);
  console.log(`👤 Database User: ${user}`);
  console.log(`🗄️ Database Name: ${database}`);
  console.log(`🔒 SSL Enabled:  ${useSsl ? 'YES' : 'NO'}`);
  console.log('------------------------------------------------------------');

  const connectionConfig = {
    host,
    port,
    user,
    password,
    database,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 10000
  };

  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('✅ Connection established with MySQL server successfully!');
  } catch (err) {
    console.error('❌ Failed to connect to MySQL database:', err.message);
    process.exit(1);
  }

  try {
    // 1. Users Table
    console.log('📦 Creating table "users"...');
    await connection.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('  └─ Table "users" ready.');

    // 2. Categories Table
    console.log('📦 Creating table "categories"...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        icon VARCHAR(20) NOT NULL DEFAULT '📌',
        description VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('  └─ Table "categories" ready.');

    // 3. Complaints Table
    console.log('📦 Creating table "complaints"...');
    await connection.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('  └─ Table "complaints" ready.');

    // 4. Notifications Table
    console.log('📦 Creating table "notifications"...');
    await connection.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('  └─ Table "notifications" ready.');

    // 5. Seed Admin User
    console.log('🌱 Seeding Administrator Account...');
    await connection.query(`
      INSERT INTO users (full_name, email, phone, department, year, password_hash, role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);
    `, [
      'Campus Administrator',
      'admin@fixmycampus.com',
      '0000000000',
      'Campus Administration',
      'Admin',
      ADMIN_PASSWORD_HASH,
      'admin'
    ]);
    console.log('  └─ Admin account seeded: admin@fixmycampus.com (Password: admin123)');

    // 6. Seed Categories
    console.log('🌱 Seeding Default Categories...');
    for (const cat of DEFAULT_CATEGORIES) {
      await connection.query(`
        INSERT INTO categories (name, icon, description)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE icon = VALUES(icon), description = VALUES(description);
      `, [cat.name, cat.icon, cat.desc]);
    }
    console.log(`  └─ Seeded ${DEFAULT_CATEGORIES.length} default campus issue categories.`);

    // 7. Verify Counts
    const [uRows] = await connection.query('SELECT COUNT(*) AS total FROM users');
    const [cRows] = await connection.query('SELECT COUNT(*) AS total FROM categories');
    const [compRows] = await connection.query('SELECT COUNT(*) AS total FROM complaints');

    console.log('------------------------------------------------------------');
    console.log('🎉 Database Schema & Seeds Successfully Initialized!');
    console.log(`   👥 Total Users:        ${uRows[0].total}`);
    console.log(`   📁 Total Categories:   ${cRows[0].total}`);
    console.log(`   📝 Total Complaints:   ${compRows[0].total}`);
    console.log('============================================================');
    console.log('You can now start the server with: npm start');
  } catch (err) {
    console.error('❌ Error executing schema initialization:', err);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initializeDatabase();
