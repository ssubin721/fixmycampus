# FixMyCampus – Deployment & Production Server Guide 🌐

This document covers all options for deploying and running the **FixMyCampus** backend and mobile application across local Wi-Fi networks, Docker, self-hosted Linux/Windows VPS, and cloud hosting providers (Render, Railway, AWS, DigitalOcean).

---

## 1. Quick Local & Mobile Wi-Fi Network Setup (Immediate Testing)

The FixMyCampus backend automatically binds to `0.0.0.0` (all network interfaces) and detects your computer's local Wi-Fi / LAN IP.

### Step 1: Start the Backend
```bash
cd backend
npm install
npm start
```
The server will log:
```
🏛️  FixMyCampus Server v2.0 is Live & Ready!
------------------------------------------------------------
  Local Access:      http://localhost:5000
  Mobile / Network:  http://172.20.10.11:5000  (Wi-Fi)
  Database Mode:     MYSQL (or SQLITE fallback)
============================================================
```

### Step 2: Connect from Android Mobile Phone
1. Connect your Android phone to the same Wi-Fi network (or mobile hotspot) as your computer.
2. Install and launch the **FixMyCampus APK** (`FixMyCampus.apk`) on your phone.
3. Tap **⚙️ Server & Network Settings** on the Welcome or Login screen.
4. Select the **📱 Local Wi-Fi** preset (`http://<YOUR_COMPUTER_IP>:5000`) or type your computer's IP address.
5. Tap **⚡ Test Ping** — you will see a green `🟢 Connected` badge with ping latency in milliseconds.
6. Tap **💾 Save & Apply**. The app will now communicate with your backend server over Wi-Fi!

---

## 2. Docker & Docker Compose Deployment (1-Command Full Stack)

Run the entire application, including MySQL 8.0, automatic schema initialization, and the Node.js backend in isolated Docker containers:

```bash
cd deploy
docker-compose up -d --build
```

### Containers Created:
- **`fixmycampus-mysql`**: MySQL 8.0 database running on port 3306, automatically seeded with `database/schema.sql`.
- **`fixmycampus-app`**: Node.js backend running on port 5000 with persistent photo storage volume.

### Verify Deployment:
```bash
curl http://localhost:5000/api/health
```

---

## 3. Free Cloud Deployment on Render (Public HTTPS API)

Deploy a 24/7 public cloud server with free SSL (HTTPS):

1. Push your repository to **GitHub** (exclude `node_modules` and `.apk`).
2. Log into [Render.com](https://render.com) and click **New + → Web Service**.
3. Connect your GitHub repository.
4. Configure service settings:
   - **Root Directory:** `FixMyCampus_Final1/backend` (or `backend`)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Set Environment Variables:
   - `PORT`: `5000`
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: `<Generate a random 64-character secret>`
   - `FORCE_SQLITE`: `true` (for zero-cost embedded database) or configure Render MySQL.
6. Click **Create Web Service**.
7. Once deployed, Render will provide a public URL like `https://fixmycampus-api.onrender.com`.
8. In the FixMyCampus Android app, open **⚙️ Server Settings**, paste `https://fixmycampus-api.onrender.com`, test ping, and save! The app now works worldwide over 4G, 5G, and any Wi-Fi network!

---

## 4. Railway.app Deployment (One-Click with Cloud MySQL)

1. Create a project at [Railway.app](https://railway.app).
2. Click **New → Database → MySQL**.
3. Click **New → GitHub Repo** and select the FixMyCampus project.
4. In the App Service settings, link the MySQL database variables (`MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQLPORT`).
5. Set `PORT=5000` and start command `cd backend && npm start`.
6. Railway will provision a public domain `https://<your-app>.up.railway.app`.

---

## 5. Linux / Ubuntu VPS Deployment (Systemd + Nginx + Let's Encrypt)

For dedicated servers or VPS (DigitalOcean, Linode, AWS EC2, Hetzner):

### 1. Install Node.js & MySQL
```bash
sudo apt update && sudo apt install -y nodejs npm mysql-server nginx certbot python3-certbot-nginx
```

### 2. Set Up Database
```bash
sudo mysql < database/schema.sql
```

### 3. Setup Systemd Service
Create `/etc/systemd/system/fixmycampus.service`:
```ini
[Unit]
Description=FixMyCampus Backend Service
After=network.target mysql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/fixmycampus/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=PORT=5000
Environment=NODE_ENV=production
Environment=DB_HOST=localhost
Environment=DB_USER=root
Environment=DB_PASSWORD=your_mysql_password
Environment=DB_NAME=fixmycampus
Environment=JWT_SECRET=your_production_secret

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable fixmycampus
sudo systemctl start fixmycampus
```

### 4. Configure Nginx Reverse Proxy
```nginx
server {
    server_name yourdomain.com;

    client_max_body_size 15M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
}
```

Enable SSL:
```bash
sudo certbot --nginx -d yourdomain.com
```

---

## 6. Security & Credentials Best Practices

- 🔒 **Never hardcode passwords or secrets** in client-side HTML, CSS, or JS files. All requests are authenticated with JSON Web Tokens (JWT) using `Authorization: Bearer <token>` headers.
- 🔑 Passwords are encrypted with 10 salt rounds of **bcrypt**.
- 🛡️ Database connection pooling automatically handles reconnection and drops.
- 🖼️ Uploaded photos are strictly validated for MIME type (`image/jpeg`, `image/png`, `image/webp`) and stored with collision-resistant timestamps in `uploads/`.
- ⚡ Client-side image compression downsizes photos to ~400KB before upload, ensuring zero packet drops on cellular networks.
