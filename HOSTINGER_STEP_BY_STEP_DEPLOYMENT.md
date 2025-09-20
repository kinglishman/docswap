# 🚀 DocSwap Hostinger Deployment - Complete Step-by-Step Guide

## 📋 Pre-Deployment Checklist

Before starting, ensure you have:
- [ ] Hostinger VPS or Cloud Hosting plan (NOT shared hosting)
- [ ] Domain name registered and pointed to Hostinger
- [ ] SSH access credentials from Hostinger
- [ ] Supabase project set up with credentials
- [ ] Your local DocSwap application working

---

## 🔧 STEP 1: Access Your Hostinger Server

### 1.1 Get Your Server Details
1. Log into your **Hostinger control panel**
2. Go to **VPS** or **Cloud Hosting** section
3. Note down:
   - **Server IP address**
   - **SSH username** (usually `root`)
   - **SSH password** or upload your SSH key

### 1.2 Connect to Your Server
```bash
# Replace YOUR_SERVER_IP with your actual IP
ssh root@YOUR_SERVER_IP
```

**First time connection:**
- Type `yes` when asked about authenticity
- Enter your password when prompted

---

## 🛠️ STEP 2: Prepare the Server Environment

### 2.1 Update System Packages
```bash
# Update package lists and upgrade system
apt update && apt upgrade -y
```

### 2.2 Install Python and Dependencies
```bash
# Install Python 3.11 and related tools
apt install python3.11 python3.11-pip python3.11-venv -y

# Install web server and process manager
apt install nginx supervisor git curl -y

# Install document processing tools
apt install poppler-utils tesseract-ocr libreoffice -y

# Install additional system dependencies
apt install build-essential python3.11-dev -y
```

### 2.3 Verify Installations
```bash
# Check Python version
python3.11 --version

# Check if services are running
systemctl status nginx
systemctl status supervisor
```

---

## 📁 STEP 3: Upload Your Application

### 3.1 Create Application Directory
```bash
# Create the main application directory
mkdir -p /var/www/docswap
cd /var/www/docswap
```

### 3.2 Upload Your Files (Choose ONE method)

**Method A: Using Git (Recommended)**
```bash
# If you have your code in a Git repository
git clone https://github.com/YOUR_USERNAME/docswap.git .
```

**Method B: Using SCP from your local machine**
```bash
# Run this from your LOCAL machine (not the server)
# Replace YOUR_SERVER_IP with your actual IP
scp -r /Users/bahaasalem/Desktop/DOCSWAP/* root@YOUR_SERVER_IP:/var/www/docswap/
```

**Method C: Using Hostinger File Manager**
1. Go to Hostinger control panel
2. Open **File Manager**
3. Navigate to `/var/www/docswap`
4. Upload all files from your local DOCSWAP folder

### 3.3 Verify Files Are Uploaded
```bash
# Check if files are there
ls -la /var/www/docswap
```

You should see: `app.py`, `requirements.txt`, `index.html`, etc.

---

## 🐍 STEP 4: Set Up Python Environment

### 4.1 Create Virtual Environment
```bash
cd /var/www/docswap
python3.11 -m venv venv
```

### 4.2 Activate Virtual Environment
```bash
source venv/bin/activate
```

### 4.3 Install Python Dependencies
```bash
# Upgrade pip first
pip install --upgrade pip

# Install all requirements
pip install -r requirements.txt

# Install Gunicorn for production
pip install gunicorn
```

### 4.4 Test Installation
```bash
# Quick test to see if app loads
python3.11 -c "import app; print('App imports successfully')"
```

---

## ⚙️ STEP 5: Configure Environment Variables

### 5.1 Create Production Environment File
```bash
# Copy the production template
cp .env.production .env

# Edit the environment file
nano .env
```

### 5.2 Update Environment Variables
**Replace these values in the .env file:**

```bash
# Flask Configuration
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=YOUR_SUPER_SECURE_SECRET_KEY_HERE

# Server Configuration
HOST=0.0.0.0
PORT=5000

# Supabase Configuration (Get from your Supabase dashboard)
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
SUPABASE_JWT_SECRET=YOUR_JWT_SECRET

# Security Configuration (Replace with your actual domain)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Admin Portal (Change these!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YOUR_SECURE_ADMIN_PASSWORD

# File Upload Configuration
MAX_FILE_SIZE=104857600
FILE_EXPIRY=86400
RATE_LIMIT_PER_MINUTE=30
ADMIN_SESSION_TIMEOUT=3600
```

**To get your Supabase credentials:**
1. Go to [supabase.com](https://supabase.com)
2. Open your project
3. Go to **Settings** → **API**
4. Copy the URL and keys

### 5.3 Secure the Environment File
```bash
# Set proper permissions
chmod 600 .env
```

---

## 🔄 STEP 6: Configure Gunicorn

### 6.1 Create Gunicorn Configuration
```bash
nano /var/www/docswap/gunicorn.conf.py
```

**Add this content:**
```python
bind = "127.0.0.1:5000"
workers = 4
worker_class = "sync"
worker_connections = 1000
timeout = 300
keepalive = 2
max_requests = 1000
max_requests_jitter = 100
preload_app = True
user = "www-data"
group = "www-data"
```

### 6.2 Test Gunicorn
```bash
cd /var/www/docswap
source venv/bin/activate
gunicorn --config gunicorn.conf.py app:app
```

**If successful, you'll see:**
```
[INFO] Starting gunicorn 21.2.0
[INFO] Listening at: http://127.0.0.1:5000
```

Press `Ctrl+C` to stop the test.

---

## 👥 STEP 7: Set Up Process Management with Supervisor

### 7.1 Create Supervisor Configuration
```bash
nano /etc/supervisor/conf.d/docswap.conf
```

**Add this content:**
```ini
[program:docswap]
command=/var/www/docswap/venv/bin/gunicorn --config /var/www/docswap/gunicorn.conf.py app:app
directory=/var/www/docswap
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/docswap.log
environment=PATH="/var/www/docswap/venv/bin"
```

### 7.2 Set Proper Permissions
```bash
# Change ownership to www-data
chown -R www-data:www-data /var/www/docswap
chmod -R 755 /var/www/docswap
```

### 7.3 Start Supervisor
```bash
# Reload supervisor configuration
supervisorctl reread
supervisorctl update

# Start the application
supervisorctl start docswap

# Check status
supervisorctl status
```

**You should see:**
```
docswap                          RUNNING   pid 1234, uptime 0:00:05
```

---

## 🌐 STEP 8: Configure Nginx Web Server

### 8.1 Create Nginx Site Configuration
```bash
nano /etc/nginx/sites-available/docswap
```

**Add this content (replace yourdomain.com with your actual domain):**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    location /static {
        alias /var/www/docswap/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 8.2 Enable the Site
```bash
# Create symbolic link to enable site
ln -s /etc/nginx/sites-available/docswap /etc/nginx/sites-enabled/

# Remove default site if it exists
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t
```

**You should see:**
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 8.3 Restart Nginx
```bash
systemctl restart nginx
systemctl status nginx
```

---

## 🔒 STEP 9: Configure SSL Certificate (HTTPS)

### 9.1 Install Certbot
```bash
apt install certbot python3-certbot-nginx -y
```

### 9.2 Obtain SSL Certificate
```bash
# Replace yourdomain.com with your actual domain
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Follow the prompts:**
1. Enter your email address
2. Agree to terms of service
3. Choose whether to share email with EFF
4. Select option 2 (redirect HTTP to HTTPS)

---

## 🛡️ STEP 10: Configure Firewall

### 10.1 Set Up UFW Firewall
```bash
# Allow SSH (important - don't lock yourself out!)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable
```

### 10.2 Check Firewall Status
```bash
ufw status
```

---

## 🔧 STEP 11: Configure Supabase

### 11.1 Update CORS Settings
1. Go to your **Supabase Dashboard**
2. Navigate to **Settings** → **API**
3. In **CORS allowed origins**, add:
   ```
   https://yourdomain.com
   https://www.yourdomain.com
   ```

### 11.2 Configure Authentication
1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. If using Google OAuth, add your domain to redirect URIs

---

## 🧪 STEP 12: Test Your Deployment

### 12.1 Check Application Status
```bash
# Check if application is running
supervisorctl status docswap

# Check logs for any errors
tail -f /var/log/docswap.log
```

### 12.2 Test from Command Line
```bash
# Test local connection
curl http://localhost:5000

# Test external connection (replace with your domain)
curl https://yourdomain.com
```

### 12.3 Test in Browser
1. Open your browser
2. Go to `https://yourdomain.com`
3. Test file upload and conversion
4. Test user authentication
5. Check admin panel at `https://yourdomain.com/admin`

---

## 📊 STEP 13: Set Up Monitoring and Maintenance

### 13.1 Configure Log Rotation
```bash
nano /etc/logrotate.d/docswap
```

**Add:**
```
/var/log/docswap.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        supervisorctl restart docswap
    endscript
}
```

### 13.2 Set Up Automatic Updates
```bash
crontab -e
```

**Add these lines:**
```bash
# Update system weekly
0 2 * * 0 apt update && apt upgrade -y

# Restart application daily
0 3 * * * supervisorctl restart docswap
```

---

## 🎉 STEP 14: Final Verification

### 14.1 Complete Functionality Test
- [ ] Website loads at your domain
- [ ] File upload works
- [ ] File conversion works
- [ ] File download works
- [ ] User authentication works
- [ ] Admin panel accessible
- [ ] SSL certificate is active (green lock in browser)

### 14.2 Performance Check
```bash
# Check server resources
htop
df -h
free -h
```

---

## 🚨 Troubleshooting Common Issues

### Issue: 502 Bad Gateway
```bash
# Check if application is running
supervisorctl status docswap

# Check logs
tail -f /var/log/docswap.log

# Restart if needed
supervisorctl restart docswap
```

### Issue: File Upload Errors
```bash
# Check disk space
df -h

# Check permissions
ls -la /var/www/docswap/uploads
```

### Issue: Authentication Not Working
1. Verify Supabase configuration in `.env`
2. Check CORS settings in Supabase
3. Verify domain matches in all configurations

---

## 📞 Support Resources

- **Hostinger Support**: For server-related issues
- **Supabase Documentation**: For authentication issues
- **Application Logs**: `/var/log/docswap.log`
- **Nginx Logs**: `/var/log/nginx/error.log`

---

## 🎯 Quick Commands Reference

```bash
# Restart application
supervisorctl restart docswap

# View logs
tail -f /var/log/docswap.log

# Check status
supervisorctl status
systemctl status nginx

# Update application (if using Git)
cd /var/www/docswap
git pull
source venv/bin/activate
pip install -r requirements.txt
supervisorctl restart docswap
```

**🎉 Congratulations! Your DocSwap application should now be live at your domain!**