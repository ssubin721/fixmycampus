const path = require('path');
const fs = require('fs');
require('dotenv').config();

let pool;
let dbMode = 'mysql';

// Default seeded bcrypt hash for "admin123"
const ADMIN_PASSWORD_HASH = '$2b$10$hWIVq/N8h72W5ewWQybR.esmTzWF8s7OA2K3GJthKXL2V4bNEk7Ka';

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

function createSqliteAdapter() {
  const sqlite3 = require('sqlite3').verbose();
  const dbDir = path.join(__dirname, '..', '..', 'database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, 'fixmycampus.sqlite');
  const sqliteDb = new sqlite3.Database(dbPath);

  // Enable foreign keys
  sqliteDb.run('PRAGMA foreign_keys = ON');

  const adapter = {
    mode: 'sqlite',
    query(sql, params = []) {
      return new Promise((resolve, reject) => {
        const cleanSql = sql.trim();
        const upper = cleanSql.toUpperCase();

        if (upper.startsWith('SELECT') || upper.startsWith('PRAGMA') || upper.startsWith('SHOW')) {
          sqliteDb.all(cleanSql, params, (err, rows) => {
            if (err) return reject(err);
            resolve([rows || [], []]);
          });
        } else if (upper.startsWith('INSERT')) {
          sqliteDb.run(cleanSql, params, function (err) {
            if (err) return reject(err);
            resolve([{ insertId: this.lastID, affectedRows: this.changes }, []]);
          });
        } else {
          // UPDATE, DELETE, CREATE, DROP, etc.
          sqliteDb.run(cleanSql, params, function (err) {
            if (err) return reject(err);
            resolve([{ affectedRows: this.changes || 0 }, []]);
          });
        }
      });
    },
    async initSchema() {
      await this.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          full_name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          phone TEXT,
          department TEXT,
          year TEXT,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'student',
          avatar_url TEXT DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          icon TEXT NOT NULL DEFAULT '📌',
          description TEXT DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS complaints (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          location TEXT,
          photo_url TEXT DEFAULT NULL,
          resolution_photo_url TEXT DEFAULT NULL,
          status TEXT NOT NULL DEFAULT 'Pending',
          assigned_staff TEXT DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      await this.query(`
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

      // Seed admin if not present
      const [adminRows] = await this.query('SELECT id FROM users WHERE email = ?', ['admin@fixmycampus.com']);
      if (adminRows.length === 0) {
        await this.query(
          `INSERT INTO users (full_name, email, phone, department, year, password_hash, role)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          ['Campus Administrator', 'admin@fixmycampus.com', '0000000000', 'Campus Administration', 'Admin', ADMIN_PASSWORD_HASH, 'admin']
        );
      }

      // Seed categories
      for (const cat of DEFAULT_CATEGORIES) {
        const [existing] = await this.query('SELECT id FROM categories WHERE name = ?', [cat.name]);
        if (existing.length === 0) {
          await this.query('INSERT INTO categories (name, icon, description) VALUES (?, ?, ?)', [cat.name, cat.icon, cat.desc]);
        }
      }
    }
  };

  return adapter;
}

// Check MySQL connection and initialize
const mysql = require('mysql2/promise');

const useSsl = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';

const mysqlConfig = {
  host: (process.env.DB_HOST || 'localhost').trim(),
  user: (process.env.DB_USER || 'root').trim(),
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD.trim() : '',
  database: (process.env.DB_NAME || 'fixmycampus').trim(),
  port: Number(process.env.DB_PORT) || 3306,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000
};

let mysqlPool = null;

try {
  mysqlPool = mysql.createPool(mysqlConfig);
} catch (e) {
  console.warn('⚠️ MySQL pool initialization failed:', e.message);
}

// Wrapper that proxies calls to MySQL or SQLite fallback
const dbProxy = {
  get mode() {
    return dbMode;
  },
  async query(sql, params) {
    if (dbMode === 'mysql' && mysqlPool) {
      try {
        return await mysqlPool.query(sql, params);
      } catch (err) {
        // If MySQL server dropped or query failed due to connection error, fallback
        if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ETIMEDOUT') {
          console.warn(`⚠️ MySQL disconnected (${err.code}). Switching to SQLite fallback.`);
          dbMode = 'sqlite';
          if (!pool || pool.mode !== 'sqlite') {
            pool = createSqliteAdapter();
            await pool.initSchema();
          }
          return pool.query(sql, params);
        }
        throw err;
      }
    }
    return pool.query(sql, params);
  },
  async init() {
    if (process.env.FORCE_SQLITE === 'true') {
      console.log('📦 FORCE_SQLITE is set. Using embedded SQLite database.');
      dbMode = 'sqlite';
      pool = createSqliteAdapter();
      await pool.initSchema();
      return;
    }

    if (mysqlPool) {
      try {
        const conn = await mysqlPool.getConnection();
        conn.release();
        dbMode = 'mysql';
        console.log(`✅ Database: Connected to MySQL database "${mysqlConfig.database}" at ${mysqlConfig.host}:${mysqlConfig.port}`);

        // Ensure all tables exist in MySQL
        await mysqlPool.query(`
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

        await mysqlPool.query(`
          CREATE TABLE IF NOT EXISTS categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            icon VARCHAR(20) NOT NULL DEFAULT '📌',
            description VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await mysqlPool.query(`
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

        await mysqlPool.query(`
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

        // Seed admin if not present
        await mysqlPool.query(`
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

        // Seed default categories in MySQL if empty
        const [cats] = await mysqlPool.query('SELECT COUNT(*) AS c FROM categories');
        if (cats[0].c === 0) {
          for (const cat of DEFAULT_CATEGORIES) {
            await mysqlPool.query(
              'INSERT IGNORE INTO categories (name, icon, description) VALUES (?, ?, ?)',
              [cat.name, cat.icon, cat.desc]
            );
          }
        }
        return;
      } catch (err) {
        console.warn(`⚠️ MySQL connection error: ${err.message}. Activating embedded SQLite fallback database.`);
      }
    }

    dbMode = 'sqlite';
    pool = createSqliteAdapter();
    await pool.initSchema();
    console.log('✅ Database: Running in resilient SQLite mode.');
  }
};

// Immediate background check
dbProxy.init().catch(err => {
  console.error('Database initialization error:', err);
});

module.exports = dbProxy;
