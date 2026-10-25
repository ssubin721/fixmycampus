# FixMyCampus 🏛️📱 – Complete Production Mobile Application

**FixMyCampus** is a complete, production-ready, full-stack campus infrastructure and complaint reporting mobile application. It connects students directly with campus administrators and maintenance staff to report, triage, track, and resolve campus infrastructure issues (electrical, plumbing, sanitation, Wi-Fi, furniture, safety, etc.) with real-time notifications and photo proof.

Built from the ground up for **Universal Mobile Compatibility**, FixMyCampus works reliably on any Android device and across all internet network connections (Wi-Fi, 4G, 5G, and unstable or low-speed connections).

---

## 🌟 Key Features & What's New in v2.0

### 1. Universal Mobile Compatibility & Network Resilience
- **Native Android APK Build:** Ready-to-install Android APK (`FixMyCampus.apk`) compiled with Android SDK 36.
- **Fluid Edge-to-Edge Responsive Layout:** Full safe-area support (`env(safe-area-inset-top)` / `bottom`) that eliminates artificial phone bezels and looks native on any Android screen size, tablet, or foldable device.
- **Dynamic Server URL Engine:** Switch backend servers on-the-fly without rebuilding the app! Includes a built-in **⚙️ Network & Server Settings Modal** accessible from topbars and offline banners with 1-tap presets and a real-time **⚡ Latency Ping Tester**.
- **Client-Side Image Optimization:** Automatically downsamples heavy camera photos (8MB–25MB from modern smartphone cameras) to optimal web dimensions (~1280px, ~400KB JPEG) using HTML5 Canvas in < 300ms. Eliminates timeouts and payload failures on cellular 3G/4G/5G data!
- **Auto-Retry & Request Timeout:** Automatic exponential backoff retries on transient connection drops with a 15-second safety timeout.
- **Draft Form Preservation:** Automatically saves complaint drafts (`category`, `title`, `location`, `description`) in local storage and restores them if the connection drops or the app is closed.

### 2. Dual-Mode Resilient Database Layer
- **Production MySQL 8.0+:** Robust connection pooling with parameterized queries and index optimization.
- **Zero-Config SQLite Automatic Fallback:** If MySQL is not running or credentials fail, the server automatically boots into an embedded SQLite database (`database/fixmycampus.sqlite`), auto-creates all tables, and seeds the default admin account. **The backend NEVER crashes due to database connection failures!**

### 3. Student / User Module
- **Registration & Login:** Clean JWT authentication with bcrypt password hashing and real-time input validation.
- **Visual Category Grid & 1-Tap Quick Issue Chips:** Tap a category card (Plumbing, Electrical, Sanitation, Wi-Fi, Metal, Furniture, Gardens, Security) and choose 1-tap quick issue buttons (e.g. "Pipe Leakage", "Fan Not Working", "Dustbin Overflowing") to auto-fill description and title.
- **Photo Proof Upload:** Capture from camera or select from gallery with instant preview and zoomable lightbox.
- **Live Ticket Status Tracking:** Pending (yellow), In Progress (blue), Completed (green).
- **Resolution Proof Photos:** View before-and-after photo evidence uploaded by campus technicians upon resolution.
- **Profile Management:** View/edit contact details, department, academic year, and avatar picture.
- **In-App Notifications:** Real-time notification drawer with unread counter badge.

### 4. Admin Management Module
- **Executive Analytics Dashboard:** Total complaints, Pending, In Progress, Completed counts, plus category breakdown pills and recent activity feed.
- **Complaint Management:** Update status, assign technicians (Electrician, Plumber, Carpenter, Cleaning Staff, IT Support, General Maintenance), and upload resolution proof photos.
- **Full User Management (`admin-users.html`):** Search, view student profiles, monitor ticket counts per student, promote/demote roles, or delete test accounts.
- **Category Management (`admin-categories.html`):** Add custom campus issue categories with custom emojis and descriptions, or delete obsolete categories.
- **Ticket Filtering & Global Search:** Filter by status, category, or search across student names, room numbers, and descriptions.

---

## 📁 Project Architecture & Directory Structure

```
FixMyCampus/
├── backend/
│   ├── config/
│   │   └── db.js                 # Resilient Dual-Mode Database Adapter (MySQL + SQLite)
│   ├── controllers/
│   │   ├── adminController.js     # Admin dashboard, tickets, user & category management
│   │   ├── authController.js      # Student & Admin authentication, profile management
│   │   ├── complaintController.js # Complaint submission, queries, status tracking
│   │   └── notificationController.js # Alert broadcasts and read tracking
│   ├── middleware/
│   │   ├── auth.js                # JWT token verification and admin guard
│   │   └── upload.js              # Multer 10MB photo upload with MIME validation
│   ├── routes/
│   │   ├── admin.routes.js        # /api/admin/*
│   │   ├── auth.routes.js         # /api/auth/*
│   │   ├── complaint.routes.js    # /api/complaints/*
│   │   └── notification.routes.js # /api/notifications/*
│   ├── tests/
│   │   ├── run_e2e.js             # Automated server boot & test runner
│   │   └── verify_app.js          # 13-point automated integration test suite
│   ├── uploads/                   # Uploaded complaint and resolution photos
│   ├── server.js                  # Express server with CORS & diagnostic API
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── css/
│   │   └── style.css              # Fluid responsive design system (light/dark mode)
│   ├── js/
│   │   ├── api.js                 # API client, network manager, image compressor, draft manager
│   │   └── validation.js          # Field validation and strength checker
│   ├── icons/                     # Official app logos, adaptive icons, and splash assets
│   ├── index.html                 # App entrance & splash screen
│   ├── welcome.html               # Welcome onboarding screen with server settings
│   ├── login.html                 # Student login portal
│   ├── register.html              # Student registration
│   ├── student-home.html          # Student home dashboard with live statistics
│   ├── report-complaint.html      # Complaint submission with photo compression & draft restoration
│   ├── my-complaints.html         # Student ticket tracking and filtering
│   ├── complaint-details.html     # Ticket details and resolution photo viewer
│   ├── profile.html               # Student account and avatar settings
│   ├── admin-login.html           # Dedicated admin authentication portal
│   ├── admin-dashboard.html       # Admin overview with category breakdowns
│   ├── all-complaints.html        # Admin ticket management directory
│   ├── complaint-management.html  # Admin status update, technician assignment, resolution photo
│   ├── admin-users.html           # Admin campus user directory and role management
│   ├── admin-categories.html      # Admin category management
│   ├── manifest.json              # Web app manifest
│   └── service-worker.js          # Offline cache worker v4
├── android/                       # Native Android Project (Capacitor + Gradle)
│   ├── app/
│   │   ├── src/main/AndroidManifest.xml # Permissions: INTERNET, CAMERA, cleartext traffic
│   │   └── build.gradle
│   └── gradlew.bat
├── database/
│   └── schema.sql                 # Complete MySQL schema with categories and admin seed
├── deploy/
│   ├── Dockerfile                 # Production Alpine Node.js container
│   ├── docker-compose.yml         # Full stack container configuration (App + MySQL)
│   ├── render.yaml                # Render cloud deployment blueprint
│   └── DEPLOYMENT_GUIDE.md        # Comprehensive deployment handbook
├── FixMyCampus.apk                # Production-ready Android debug/release APK
├── capacitor.config.json          # Capacitor mobile runtime configuration
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v18+ ([nodejs.org](https://nodejs.org))
- **MySQL 8.0+** (optional — if MySQL is not running, the app automatically switches to SQLite fallback mode)

---

### 2. Running the Backend Server
```bash
cd backend
npm install
npm start
```

The server automatically detects your network interfaces and prints:
```
============================================================
🏛️  FixMyCampus Server v2.0 is Live & Ready!
------------------------------------------------------------
  Local Access:      http://localhost:5000
  Mobile / Network:  http://172.20.10.11:5000  (Wi-Fi)
  Database Mode:     MYSQL (or SQLITE)
============================================================
```

> **Note:** To run tests and verify the entire backend automatically, run:
> ```bash
> node tests/run_e2e.js
> ```

---

### 3. Installing & Running on an Android Mobile Phone

1. **Install the APK:**
   - Transfer `FixMyCampus.apk` to your Android device via USB, WhatsApp, Google Drive, or local network.
   - Tap the APK file on your Android phone and select **Install** (allow "Install from Unknown Sources" if prompted).
2. **Configure Connection:**
   - Ensure your phone is connected to the same Wi-Fi network as your computer (or computer mobile hotspot).
   - Open the FixMyCampus app on your phone.
   - On the Welcome or Login screen, tap **⚙️ Server & Network Settings**.
   - Select the **📱 Local Wi-Fi** button or enter `http://<YOUR_COMPUTER_IP>:5000`.
   - Tap **⚡ Test Ping** to confirm connectivity (`🟢 Connected`), then tap **💾 Save & Apply**.
3. **Use the App:** You can now register accounts, submit tickets with camera photos, track tickets, and use admin features seamlessly from your mobile phone!

---

## 🔑 Default Accounts & Credentials

| Role | Email | Password | Access Portal |
|---|---|---|---|
| **Campus Admin** | `admin@fixmycampus.com` | `admin123` | `admin-login.html` |
| **Student** | Create any new account | User defined | `register.html` → `login.html` |

---

## 📡 REST API Reference

All protected endpoints require an `Authorization: Bearer <token>` header returned from login or registration.

### Authentication & Users (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new student account |
| `POST` | `/api/auth/login` | Authenticate student or admin |
| `POST` | `/api/auth/admin-login` | Dedicated admin authentication |
| `GET` | `/api/auth/profile` | Retrieve authenticated user profile |
| `PUT` | `/api/auth/profile` | Update profile information and avatar photo |

### Complaints (`/api/complaints`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/complaints` | Submit a ticket (`multipart/form-data`: category, description, location, photo) |
| `GET` | `/api/complaints/my` | Retrieve tickets submitted by the logged-in student |
| `GET` | `/api/complaints/:id` | Get details of a single ticket |
| `GET` | `/api/complaints/stats/summary` | Summary count of student tickets grouped by status |
| `GET` | `/api/complaints/categories` | Retrieve active categories list |

### Admin Management (`/api/admin`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/stats` | Dashboard totals, category breakdowns, and 5 recent tickets |
| `GET` | `/api/admin/complaints` | All campus tickets (filters: `?status=`, `?category=`, `?search=`) |
| `PUT` | `/api/admin/complaints/:id` | Update status, assign technician, upload resolution photo |
| `GET` | `/api/admin/users` | List all campus users with ticket counts |
| `PUT` | `/api/admin/users/:id/role` | Toggle user role between `student` and `admin` |
| `DELETE`| `/api/admin/users/:id` | Delete user account and associated complaints |
| `GET` | `/api/admin/categories` | List all categories with live ticket count |
| `POST` | `/api/admin/categories` | Add a new campus issue category |
| `DELETE`| `/api/admin/categories/:id`| Remove a category |

### Notifications & System (`/api/notifications`, `/api/health`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/notifications` | Get user notifications and unread count |
| `PUT` | `/api/notifications/read` | Mark all notifications as read |
| `PUT` | `/api/notifications/:id/read` | Mark single notification as read |
| `GET` | `/api/health` | Diagnostic status, database mode, uptime, and network IPs |
| `GET` | `/api/config` | Public server version and capabilities |

---

## 🐳 Cloud Deployment Options

For comprehensive guides on deploying to **Docker**, **Render.com**, **Railway.app**, or an **Ubuntu VPS (Nginx + SSL)**, refer to [`deploy/DEPLOYMENT_GUIDE.md`](deploy/DEPLOYMENT_GUIDE.md).

### Quick Docker Launch:
```bash
cd deploy
docker-compose up -d --build
```

---

## 📄 License
This project is licensed under the ISC License.
