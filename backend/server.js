const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
require('dotenv').config();

const db = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const complaintRoutes = require('./routes/complaint.routes');
const adminRoutes = require('./routes/admin.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();

// Helper to get local network IPv4 addresses
function getNetworkIps() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ interface: name, ip: iface.address });
      }
    }
  }
  return addresses;
}

// Enhanced CORS Configuration for mobile web, Capacitor, and native WebViews
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Range'],
  exposedHeaders: ['Content-Length', 'Content-Range']
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve uploaded complaint photos with cache headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// Serve the frontend static assets
app.use(express.static(path.join(__dirname, '..', 'frontend'), {
  maxAge: '1h'
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Detailed Health & Diagnostic Endpoint
app.get('/api/health', (req, res) => {
  const ips = getNetworkIps();
  res.json({
    status: 'ok',
    appName: 'FixMyCampus',
    version: '2.0.0',
    uptime: Math.round(process.uptime()),
    dbMode: db.mode,
    serverTime: new Date().toISOString(),
    networkIps: ips
  });
});

// Mobile App Configuration Endpoint
app.get('/api/config', (req, res) => {
  res.json({
    appName: 'FixMyCampus',
    version: '2.0.0',
    status: 'operational',
    dbMode: db.mode,
    features: {
      photoUpload: true,
      maxUploadMb: 10,
      adminPortal: true,
      realtimeNotifications: true
    }
  });
});

// Fallback: any non-API route serves the frontend entry point
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Something went wrong on the server.',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  const ips = getNetworkIps();
  console.log(`\n============================================================`);
  console.log(`🏛️  FixMyCampus Server v2.0 is Live & Ready!`);
  console.log(`------------------------------------------------------------`);
  console.log(`  Local Access:      http://localhost:${PORT}`);
  ips.forEach(i => {
    console.log(`  Mobile / Network:  http://${i.ip}:${PORT}  (${i.interface})`);
  });
  console.log(`  Database Mode:     ${db.mode.toUpperCase()}`);
  console.log(`============================================================\n`);
});
