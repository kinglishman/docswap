# 🚀 DocSwap Optimal Hostinger VPS Deployment Guide

## 🎯 Recommended VPS Configuration

### **Best Choice: Ubuntu 22.04 LTS**
- **Why**: Best Python support, extensive documentation, stable
- **RAM**: 2GB minimum (4GB recommended for high traffic)
- **CPU**: 2 vCPU (handles multiple file conversions efficiently)
- **Storage**: 40GB SSD (20GB minimum)

---

## ⚡ **Phase 1: VPS Setup & Initial Configuration**

### 1.1 Order Your VPS
1. **Select Ubuntu 22.04 LTS** from the OS options
2. **Choose your plan** based on expected traffic:
   - **Light usage**: 1GB RAM, 1 vCPU
   - **Medium usage**: 2GB RAM, 2 vCPU ⭐ **RECOMMENDED**
   - **High traffic**: 4GB RAM, 4 vCPU

### 1.2 Initial Server Access
```bash
# Connect to your new VPS (you'll get these details from Hostinger)
ssh root@YOUR_VPS_IP

# Update system immediately
apt update && apt upgrade -y

# Install essential security tools
apt install -y ufw fail2ban
```

### 1.3 Secure Your VPS
```bash
# Configure firewall
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable

# Configure fail2ban for SSH protection
systemctl enable fail2ban
systemctl start fail2ban
```

---

## 🐍 **Phase 2: Optimized Python Environment**

### 2.1 Install Latest Python & Dependencies
```bash
# Install Python 3.11 (latest stable)
apt install -y python3.11 python3.11-pip python3.11-venv python3.11-dev

# Install system dependencies for DocSwap
apt install -y \
    nginx \
    supervisor \
    git \
    curl \
    wget \
    unzip \
    build-essential \
    pkg-config \
    libffi-dev \
    libssl-dev

# Install document processing tools
apt install -y \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    libreoffice \
    imagemagick \
    ghostscript

# Install additional OCR languages (optional)
apt install -y tesseract-ocr-ara tesseract-ocr-fra tesseract-ocr-deu
```

### 2.2 Optimize Python Performance
```bash
# Install performance monitoring tools
apt install -y htop iotop nethogs

# Set Python optimizations
echo 'export PYTHONUNBUFFERED=1' >> /etc/environment
echo 'export PYTHONDONTWRITEBYTECODE=1' >> /etc/environment
```

---

## 📁 **Phase 3: Application Deployment**

### 3.1 Create Optimized Directory Structure
```bash
# Create application directories
mkdir -p /var/www/docswap/{app,logs,backups,temp}
mkdir -p /var/www/docswap/app/{uploads,output,static}

# Set proper ownership
useradd -r -s /bin/false docswap
chown -R docswap:docswap /var/www/docswap
```

### 3.2 Deploy Application Files
```bash
cd /var/www/docswap/app

# Upload your files here (using SCP, Git, or Hostinger File Manager)
# Example with SCP from your local machine:
# scp -r /Users/bahaasalem/Desktop/DOCSWAP/* root@YOUR_VPS_IP:/var/www/docswap/app/
```

### 3.3 Setup Python Environment
```bash
cd /var/www/docswap/app
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies with optimizations
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
pip install gunicorn[gevent]  # High-performance WSGI server

# Install additional performance packages
pip install gevent psutil
```

---

## ⚙️ **Phase 4: Production Configuration**

### 4.1 Optimized Environment Configuration
```bash
# Create production environment file
cat > /var/www/docswap/app/.env << 'EOF'
# Flask Configuration
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=GENERATE_SECURE_KEY_HERE

# Server Configuration
HOST=0.0.0.0
PORT=5000

# Supabase Configuration
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SERVICE_KEY
SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_JWT_SECRET=YOUR_JWT_SECRET

# Performance Optimizations
MAX_FILE_SIZE=104857600
FILE_EXPIRY=3600
RATE_LIMIT_PER_MINUTE=60
WORKER_TIMEOUT=300

# Security
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=SECURE_PASSWORD_HERE

# Production Optimizations
PYTHONUNBUFFERED=1
PYTHONDONTWRITEBYTECODE=1
WEB_CONCURRENCY=4
EOF

# Secure the environment file
chmod 600 /var/www/docswap/app/.env
chown docswap:docswap /var/www/docswap/app/.env
```

### 4.2 High-Performance Gunicorn Configuration
```bash
cat > /var/www/docswap/app/gunicorn.conf.py << 'EOF'
# Server socket
bind = "127.0.0.1:5000"
backlog = 2048

# Worker processes
workers = 4  # 2 * CPU cores
worker_class = "gevent"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50
preload_app = True

# Timeouts
timeout = 300
keepalive = 2
graceful_timeout = 30

# Process naming
proc_name = 'docswap'

# User and group
user = "docswap"
group = "docswap"

# Logging
accesslog = "/var/www/docswap/logs/access.log"
errorlog = "/var/www/docswap/logs/error.log"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process management
pidfile = "/var/www/docswap/logs/gunicorn.pid"
daemon = False

# Performance tuning
worker_tmp_dir = "/dev/shm"  # Use RAM for worker temp files
tmp_upload_dir = "/var/www/docswap/temp"
EOF
```

---

## 🔄 **Phase 5: Process Management**

### 5.1 Optimized Supervisor Configuration
```bash
cat > /etc/supervisor/conf.d/docswap.conf << 'EOF'
[program:docswap]
command=/var/www/docswap/app/venv/bin/gunicorn --config /var/www/docswap/app/gunicorn.conf.py app:app
directory=/var/www/docswap/app
user=docswap
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/www/docswap/logs/supervisor.log
stdout_logfile_maxbytes=50MB
stdout_logfile_backups=10
environment=PATH="/var/www/docswap/app/venv/bin"
priority=999
killasgroup=true
stopasgroup=true
EOF

# Start the application
supervisorctl reread
supervisorctl update
supervisorctl start docswap
```

---

## 🌐 **Phase 6: High-Performance Nginx**

### 6.1 Optimized Nginx Configuration
```bash
cat > /etc/nginx/sites-available/docswap << 'EOF'
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;

# Upstream backend
upstream docswap_backend {
    server 127.0.0.1:5000;
    keepalive 32;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # File upload limits
    client_max_body_size 100M;
    client_body_timeout 300s;
    client_header_timeout 300s;
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Static files with caching
    location /static {
        alias /var/www/docswap/app/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
        gzip_static on;
    }
    
    # API endpoints with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://docswap_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
    
    # Upload endpoints with stricter rate limiting
    location /upload {
        limit_req zone=upload burst=5 nodelay;
        proxy_pass http://docswap_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        proxy_request_buffering off;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
    
    # All other requests
    location / {
        proxy_pass http://docswap_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
EOF

# Enable site and restart nginx
ln -sf /etc/nginx/sites-available/docswap /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

---

## 🔒 **Phase 7: SSL & Security**

### 7.1 Install SSL Certificate
```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com --non-interactive --agree-tos --email admin@yourdomain.com

# Test auto-renewal
certbot renew --dry-run
```

---

## 📊 **Phase 8: Monitoring & Optimization**

### 8.1 System Monitoring
```bash
# Install monitoring tools
apt install -y netdata

# Configure log rotation
cat > /etc/logrotate.d/docswap << 'EOF'
/var/www/docswap/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 docswap docswap
    postrotate
        supervisorctl restart docswap
    endscript
}
EOF
```

### 8.2 Performance Tuning
```bash
# Optimize system limits
cat >> /etc/security/limits.conf << 'EOF'
docswap soft nofile 65536
docswap hard nofile 65536
docswap soft nproc 4096
docswap hard nproc 4096
EOF

# Optimize kernel parameters
cat >> /etc/sysctl.conf << 'EOF'
# Network optimizations
net.core.somaxconn = 1024
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 1024
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_intvl = 60
net.ipv4.tcp_keepalive_probes = 10

# File system optimizations
fs.file-max = 65536
vm.swappiness = 10
EOF

sysctl -p
```

---

## 🎯 **Phase 9: Automated Maintenance**

### 9.1 Backup Script
```bash
cat > /var/www/docswap/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/www/docswap/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
tar -czf "$BACKUP_DIR/docswap_backup_$DATE.tar.gz" \
    --exclude="/var/www/docswap/app/venv" \
    --exclude="/var/www/docswap/app/uploads" \
    --exclude="/var/www/docswap/app/output" \
    /var/www/docswap/app

# Keep only last 7 backups
find "$BACKUP_DIR" -name "docswap_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: docswap_backup_$DATE.tar.gz"
EOF

chmod +x /var/www/docswap/backup.sh
```

### 9.2 Automated Tasks
```bash
# Add to crontab
crontab -e

# Add these lines:
# Daily backup at 2 AM
0 2 * * * /var/www/docswap/backup.sh

# Weekly system update (Sunday 3 AM)
0 3 * * 0 apt update && apt upgrade -y

# Daily application restart (4 AM)
0 4 * * * supervisorctl restart docswap

# Clean temp files daily (5 AM)
0 5 * * * find /var/www/docswap/app/uploads -mtime +1 -delete
0 5 * * * find /var/www/docswap/app/output -mtime +1 -delete
```

---

## ✅ **Final Verification Checklist**

- [ ] VPS is running Ubuntu 22.04 LTS
- [ ] All dependencies installed
- [ ] Application deployed and running
- [ ] Nginx configured with SSL
- [ ] Firewall properly configured
- [ ] Monitoring tools installed
- [ ] Backup system configured
- [ ] Performance optimizations applied
- [ ] Domain pointing to VPS IP
- [ ] SSL certificate active
- [ ] Application accessible via HTTPS

---

## 🚀 **Performance Expectations**

With this optimized setup, you can expect:
- **Response Time**: < 200ms for static pages
- **File Upload**: Up to 100MB files
- **Concurrent Users**: 50-100 simultaneous users (2GB VPS)
- **Uptime**: 99.9%+ with proper monitoring
- **Security**: Enterprise-level protection

---

## 📞 **Troubleshooting Commands**

```bash
# Check application status
supervisorctl status docswap

# View logs
tail -f /var/www/docswap/logs/supervisor.log
tail -f /var/www/docswap/logs/error.log

# Check system resources
htop
df -h
free -h

# Restart services
supervisorctl restart docswap
systemctl restart nginx

# Check SSL certificate
certbot certificates

# Monitor network connections
netstat -tulpn | grep :80
netstat -tulpn | grep :443
```

This setup will give you a production-ready, high-performance DocSwap deployment! 🎉