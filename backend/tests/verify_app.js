const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

function postJson(endpoint, data, token = null) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const parsed = new URL(BASE_URL + endpoint);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getJson(endpoint, token = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(BASE_URL + endpoint);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function putJson(endpoint, data, token = null) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const parsed = new URL(BASE_URL + endpoint);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting End-to-End FixMyCampus Verification Test Suite...\n');
  let studentToken = null;
  let adminToken = null;
  let testComplaintId = null;

  try {
    // 1. Health check
    const health = await getJson('/api/health');
    console.log(`[1] Health Check: Status ${health.status} · DB Mode: ${health.data.dbMode}`);
    if (health.status !== 200) throw new Error('Health check failed');

    // 2. Config check
    const config = await getJson('/api/config');
    console.log(`[2] Server Config: App "${config.data.appName}" v${config.data.version}`);
    if (config.status !== 200) throw new Error('Config check failed');

    // 3. Admin Login
    const adminLogin = await postJson('/api/auth/admin-login', {
      email: 'admin@fixmycampus.com',
      password: 'admin123'
    });
    console.log(`[3] Admin Login: Status ${adminLogin.status} · Welcome ${adminLogin.data.user.full_name}`);
    if (adminLogin.status !== 200) throw new Error('Admin login failed');
    adminToken = adminLogin.data.token;

    // 4. Student Registration or Login
    const testEmail = `student_${Date.now()}@campus.edu`;
    const reg = await postJson('/api/auth/register', {
      fullName: 'Aarav Sharma',
      email: testEmail,
      phone: '9876543210',
      department: 'Computer Science & Engineering',
      year: '3rd Year',
      password: 'password123',
      confirmPassword: 'password123'
    });
    console.log(`[4] Student Registration: Status ${reg.status} · ID: ${reg.data.user.id}`);
    if (reg.status !== 201) throw new Error('Registration failed');
    studentToken = reg.data.token;

    // 5. Student Profile
    const profile = await getJson('/api/auth/profile', studentToken);
    console.log(`[5] Student Profile: Status ${profile.status} · ${profile.data.full_name} (${profile.data.department})`);
    if (profile.status !== 200) throw new Error('Profile fetch failed');

    // 6. Report Complaint
    const newComplaint = await postJson('/api/complaints', {
      category: 'Electrical & Lights',
      description: 'Room 402 ceiling fan vibrating aggressively and producing sparking sound.',
      location: 'Block C, Room 402'
    }, studentToken);
    console.log(`[6] Report Complaint: Status ${newComplaint.status} · Complaint ID: ${newComplaint.data.complaintId}`);
    if (newComplaint.status !== 201) throw new Error('Complaint submission failed');
    testComplaintId = newComplaint.data.complaintId;

    // 7. My Complaints
    const myComplaints = await getJson('/api/complaints/my', studentToken);
    console.log(`[7] My Complaints: Found ${myComplaints.data.length} tickets for this student`);
    if (myComplaints.status !== 200) throw new Error('My complaints failed');

    // 8. Complaint Details
    const details = await getJson(`/api/complaints/${testComplaintId}`, studentToken);
    console.log(`[8] Complaint Details: Status ${details.status} · Status: ${details.data.status} · Location: ${details.data.location}`);
    if (details.status !== 200) throw new Error('Details fetch failed');

    // 9. Admin Dashboard Stats
    const stats = await getJson('/api/admin/stats', adminToken);
    console.log(`[9] Admin Dashboard: Total: ${stats.data.totalComplaints} · Pending: ${stats.data.pending} · In Progress: ${stats.data.inProgress} · Completed: ${stats.data.completed}`);
    if (stats.status !== 200) throw new Error('Admin stats failed');

    // 10. Admin Update Complaint
    const update = await putJson(`/api/admin/complaints/${testComplaintId}`, {
      status: 'In Progress',
      assignedStaff: 'Electrician'
    }, adminToken);
    console.log(`[10] Admin Update Complaint: Status ${update.status} · New Status: ${update.data.status}`);
    if (update.status !== 200) throw new Error('Admin update failed');

    // 11. Admin User Management
    const users = await getJson('/api/admin/users', adminToken);
    console.log(`[11] Admin Users List: Found ${users.data.length} registered campus users`);
    if (users.status !== 200) throw new Error('Admin users fetch failed');

    // 12. Admin Category Management
    const cats = await getJson('/api/admin/categories', adminToken);
    console.log(`[12] Admin Categories: Found ${cats.data.length} categories`);
    if (cats.status !== 200) throw new Error('Admin categories fetch failed');

    // 13. Notifications Check
    const notifs = await getJson('/api/notifications', studentToken);
    console.log(`[13] Student Notifications: Found ${notifs.data.notifications.length} notifications · Unread: ${notifs.data.unreadCount}`);
    if (notifs.status !== 200) throw new Error('Notifications check failed');

    console.log('\n============================================================');
    console.log('🎉 ALL 13 VERIFICATION TESTS PASSED SUCCESSFULLY! 100% HEALTHY');
    console.log('============================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test Suite Failed:', err.message);
    process.exit(1);
  }
}

// Start backend in background if not already running
runTests();
