#!/bin/bash

# 🚀 DocSwap VPS Deployment Script for Hostinger
# This script automates the entire deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
fi

log "🚀 Starting DocSwap VPS Deployment..."

# Phase 1: System Update and Security
log "📦 Phase 1: Updating system and configuring security..."

apt update && apt upgrade -y

# Install essential packages
apt install -y \
    ufw \
    fail2ban \
    python3.11 \
    python3.11-pip \
    python3.11-venv \
    python3.11-dev \
    nginx \
    supervisor \
    git \
    curl \
    wget \
    unzip \
    build-essential \
    pkg-config \
    libffi-dev \
    libssl-dev \
    htop \
    iotop \
    nethogs \
    certbot \
    python3-certbot-nginx

# Install document processing tools
log "📄 Installing document processing dependencies..."
apt install -y \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    libreoffice \
    imagemagick \
    ghostscript

# Configure firewall
log "🔒 Configuring firewall..."
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

# Configure fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Phase 2: Create Application Structure
log "📁 Phase 2: Creating application directories..."

# Create user for application
if ! id "docswap" &>/dev/null; then
    useradd -r -s /bin/false docswap
fi

# Create directory structure
mkdir -p /var/www/docswap/{app,logs,backups,temp}
mkdir -p /var/www/docswap/app/{uploads,output,static}

# Set ownership
chown -R docswap:docswap /var/www/docswap

# Phase 3: Performance Optimizations
log "⚡ Phase 3: Applying performance optimizations..."

# Set Python optimizations
echo 'export PYTHONUNBUFFERED=1' >> /etc/environment
echo 'export PYTHONDONTWRITEBYTECODE=1' >> /etc/environment

# Optimize system limits
cat >> /etc/security/limits.conf << 'EOF'
docswap soft nofile 65536
docswap hard nofile 65536
docswap soft nproc 4096
docswap hard nproc 4096
EOF

# Optimize kernel parameters
cat >> /etc/sysctl.conf << 'EOF'
# Network optimizations for DocSwap
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

# Phase 4: Configure Log Rotation
log "📝 Phase 4: Configuring log rotation..."

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
        supervisorctl restart docswap 2>/dev/null || true
    endscript
}
EOF

# Phase 5: Create Backup Script
log "💾 Phase 5: Setting up backup system..."

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

# Phase 6: Create Gunicorn Configuration
log "🔧 Phase 6: Creating Gunicorn configuration..."

cat > /var/www/docswap/app/gunicorn.conf.py << 'EOF'
# Server socket
bind = "127.0.0.1:5000"
backlog = 2048

# Worker processes (adjust based on CPU cores)
workers = 4
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
worker_tmp_dir = "/dev/shm"
tmp_upload_dir = "/var/www/docswap/temp"
EOF

# Phase 7: Create Supervisor Configuration
log "👥 Phase 7: Setting up process management..."

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

# Phase 8: Create Nginx Configuration Template
log "🌐 Phase 8: Creating Nginx configuration template..."

cat > /etc/nginx/sites-available/docswap << 'EOF'
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;

# Upstream backend
upstream docswap_backend {
    server 127.0.0.1:5000;
    keepalive 32;
}

server {
    listen 80;
    server_name _;  # Replace with your domain
    
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

# Remove default nginx site
rm -f /etc/nginx/sites-enabled/default

# Phase 9: Create Environment Template
log "🔧 Phase 9: Creating environment template..."

cat > /var/www/docswap/app/.env.template << 'EOF'
# Flask Configuration
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=CHANGE_THIS_TO_SECURE_RANDOM_KEY

# Server Configuration
HOST=0.0.0.0
PORT=5000

# Supabase Configuration (Get these from your Supabase dashboard)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SERVICE_KEY_HERE
SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
SUPABASE_JWT_SECRET=YOUR_JWT_SECRET_HERE

# Performance Optimizations
MAX_FILE_SIZE=104857600
FILE_EXPIRY=3600
RATE_LIMIT_PER_MINUTE=60
WORKER_TIMEOUT=300

# Security (Replace with your domain)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CHANGE_THIS_SECURE_PASSWORD

# Production Optimizations
PYTHONUNBUFFERED=1
PYTHONDONTWRITEBYTECODE=1
WEB_CONCURRENCY=4
EOF

# Phase 10: Create Deployment Helper Scripts
log "🛠️ Phase 10: Creating helper scripts..."

# Create domain setup script
cat > /var/www/docswap/setup_domain.sh << 'EOF'
#!/bin/bash

# Domain configuration
DOMAIN="mydocswap.com"

# Allow domain to be passed as parameter, but default to mydocswap.com
if [ $# -gt 0 ]; then
    DOMAIN=$1
fi

log "🌐 Using domain: $DOMAIN"

echo "Setting up domain: $DOMAIN"

# Update Nginx configuration
sed -i "s/server_name _;/server_name $DOMAIN www.$DOMAIN;/" /etc/nginx/sites-available/docswap

# Enable site
ln -sf /etc/nginx/sites-available/docswap /etc/nginx/sites-enabled/

# Test and restart nginx
nginx -t && systemctl restart nginx

echo "Domain configured! Now run SSL setup:"
echo "certbot --nginx -d $DOMAIN -d www.$DOMAIN"
EOF

chmod +x /var/www/docswap/setup_domain.sh

# Create application deployment script
cat > /var/www/docswap/deploy_app.sh << 'EOF'
#!/bin/bash

APP_DIR="/var/www/docswap/app"

echo "Deploying DocSwap application..."

cd $APP_DIR

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3.11 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip and install dependencies
pip install --upgrade pip setuptools wheel

if [ -f "requirements.txt" ]; then
    echo "Installing Python dependencies..."
    pip install -r requirements.txt
    pip install gunicorn[gevent] gevent psutil
else
    echo "Warning: requirements.txt not found!"
fi

# Set proper permissions
chown -R docswap:docswap /var/www/docswap

# Copy environment template if .env doesn't exist
if [ ! -f ".env" ]; then
    cp .env.template .env
    echo "Created .env file from template. Please edit it with your settings!"
fi

# Restart services
supervisorctl reread
supervisorctl update
supervisorctl restart docswap

echo "Application deployed! Check status with: supervisorctl status docswap"
EOF

chmod +x /var/www/docswap/deploy_app.sh

# Create monitoring script
cat > /var/www/docswap/monitor.sh << 'EOF'
#!/bin/bash

echo "=== DocSwap System Status ==="
echo

echo "📊 System Resources:"
echo "Memory Usage:"
free -h
echo
echo "Disk Usage:"
df -h /var/www/docswap
echo

echo "🔄 Service Status:"
echo "DocSwap Application:"
supervisorctl status docswap
echo
echo "Nginx:"
systemctl is-active nginx
echo
echo "Firewall:"
ufw status
echo

echo "📝 Recent Logs (last 10 lines):"
echo "Application logs:"
tail -n 10 /var/www/docswap/logs/supervisor.log 2>/dev/null || echo "No logs found"
echo
echo "Nginx error logs:"
tail -n 10 /var/log/nginx/error.log 2>/dev/null || echo "No errors"
echo

echo "🌐 Network Status:"
echo "Active connections:"
netstat -tulpn | grep -E ':(80|443|5000)' | head -5
EOF

chmod +x /var/www/docswap/monitor.sh

# Final setup
log "🎯 Final setup steps..."

# Set proper ownership for all files
chown -R docswap:docswap /var/www/docswap

# Create cron jobs for maintenance
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/docswap/backup.sh") | crontab -
(crontab -l 2>/dev/null; echo "0 3 * * 0 apt update && apt upgrade -y") | crontab -
(crontab -l 2>/dev/null; echo "0 5 * * * find /var/www/docswap/app/uploads -mtime +1 -delete") | crontab -
(crontab -l 2>/dev/null; echo "0 5 * * * find /var/www/docswap/app/output -mtime +1 -delete") | crontab -

log "✅ VPS setup completed successfully!"
echo
echo "🎉 Next Steps:"
echo "1. Upload your DocSwap application files to: /var/www/docswap/app/"
echo "2. Run: /var/www/docswap/deploy_app.sh"
echo "3. Edit: /var/www/docswap/app/.env (add your Supabase credentials)"
echo "4. Setup domain: /var/www/docswap/setup_domain.sh yourdomain.com"
echo "5. Install SSL: certbot --nginx -d yourdomain.com -d www.yourdomain.com"
echo "6. Monitor: /var/www/docswap/monitor.sh"
echo
echo "📁 Important directories:"
echo "  - Application: /var/www/docswap/app/"
echo "  - Logs: /var/www/docswap/logs/"
echo "  - Backups: /var/www/docswap/backups/"
echo
echo "🔧 Useful commands:"
echo "  - Check status: supervisorctl status docswap"
echo "  - View logs: tail -f /var/www/docswap/logs/supervisor.log"
echo "  - Restart app: supervisorctl restart docswap"
echo "  - Monitor system: /var/www/docswap/monitor.sh"
echo
warn "Don't forget to:"
warn "1. Configure your domain DNS to point to this VPS IP"
warn "2. Update Supabase CORS settings with your domain"
warn "3. Set strong passwords in the .env file"
warn "4. Test the application thoroughly before going live"