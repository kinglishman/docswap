#!/bin/bash

# DocSwap Hostinger VPS Deployment Script
# This script sets up the complete DocSwap application on a fresh VPS

set -e  # Exit on any error

echo "🚀 Starting DocSwap deployment on Hostinger VPS..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
print_status "Installing essential packages..."
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Python 3.9 and pip
print_status "Installing Python 3.9..."
sudo apt install -y python3.9 python3.9-venv python3.9-dev python3-pip

# Install Node.js 18 LTS
print_status "Installing Node.js 18 LTS..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
print_status "Installing Nginx..."
sudo apt install -y nginx

# Install Supervisor for process management
print_status "Installing Supervisor..."
sudo apt install -y supervisor

# Install system dependencies for document conversion
print_status "Installing system dependencies for document conversion..."
sudo apt install -y \
    libreoffice \
    pandoc \
    wkhtmltopdf \
    imagemagick \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    ghostscript \
    ffmpeg \
    libmagickwand-dev \
    libpoppler-cpp-dev \
    python3-dev \
    build-essential

# Configure ImageMagick policy for PDF processing
print_status "Configuring ImageMagick for PDF processing..."
sudo sed -i 's/rights="none" pattern="PDF"/rights="read|write" pattern="PDF"/' /etc/ImageMagick-6/policy.xml

# Create application directory
APP_DIR="/var/www/docswap"
print_status "Creating application directory: $APP_DIR"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Clone the repository
print_status "Cloning DocSwap repository..."
cd /var/www
if [ -d "docswap" ]; then
    print_warning "Directory exists, pulling latest changes..."
    cd docswap
    git pull origin main
else
    git clone https://github.com/kinglishman/docswap.git
    cd docswap
fi

# Create Python virtual environment
print_status "Creating Python virtual environment..."
python3.9 -m venv venv
source venv/bin/activate

# Upgrade pip
print_status "Upgrading pip..."
pip install --upgrade pip

# Install Python dependencies
print_status "Installing Python dependencies..."
pip install -r requirements.txt

# Install additional production dependencies
print_status "Installing production dependencies..."
pip install gunicorn supervisor

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs
mkdir -p sessions
mkdir -p uploads
mkdir -p downloads

# Set proper permissions
print_status "Setting proper permissions..."
chmod 755 $APP_DIR
chmod -R 755 sessions uploads downloads
chmod +x app.py

# Create environment file
print_status "Creating environment configuration..."
cat > .env << EOF
# Flask Configuration
SECRET_KEY=your-super-secret-key-change-this-in-production
FLASK_ENV=production
FLASK_DEBUG=False

# Server Configuration
HOST=0.0.0.0
PORT=8000

# File Configuration
MAX_FILE_SIZE=104857600
FILE_EXPIRY=86400
UPLOAD_FOLDER=uploads
DOWNLOAD_FOLDER=downloads

# Supabase Configuration (Update these with your actual values)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-supabase-service-key
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# Security Configuration
ALLOWED_EXTENSIONS=pdf,doc,docx,txt,rtf,odt,jpg,jpeg,png,gif,bmp,tiff,svg,webp,ppt,pptx,xls,xlsx,csv
MAX_CONTENT_LENGTH=104857600
EOF

print_warning "Please update the .env file with your actual Supabase credentials!"

# Create Gunicorn configuration
print_status "Creating Gunicorn configuration..."
cat > gunicorn.conf.py << EOF
import multiprocessing

# Server socket
bind = "127.0.0.1:8000"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 120
keepalive = 2

# Restart workers after this many requests, to help prevent memory leaks
max_requests = 1000
max_requests_jitter = 100

# Logging
accesslog = "/var/www/docswap/logs/gunicorn_access.log"
errorlog = "/var/www/docswap/logs/gunicorn_error.log"
loglevel = "info"

# Process naming
proc_name = "docswap"

# Server mechanics
daemon = False
pidfile = "/var/www/docswap/gunicorn.pid"
user = "$USER"
group = "$USER"
tmp_upload_dir = None

# SSL (if needed)
# keyfile = "/path/to/keyfile"
# certfile = "/path/to/certfile"
EOF

# Create Supervisor configuration
print_status "Creating Supervisor configuration..."
sudo tee /etc/supervisor/conf.d/docswap.conf > /dev/null << EOF
[program:docswap]
command=/var/www/docswap/venv/bin/gunicorn app:app -c /var/www/docswap/gunicorn.conf.py
directory=/var/www/docswap
user=$USER
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/www/docswap/logs/supervisor.log
environment=PATH="/var/www/docswap/venv/bin"
EOF

# Create Nginx configuration
print_status "Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/docswap > /dev/null << EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;  # Update with your actual domain
    
    client_max_body_size 100M;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Serve static files directly
    location /static/ {
        alias /var/www/docswap/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Serve uploaded files
    location /uploads/ {
        alias /var/www/docswap/uploads/;
        expires 1h;
    }
    
    # Serve downloaded files
    location /downloads/ {
        alias /var/www/docswap/downloads/;
        expires 1h;
    }
    
    # Main application
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
        access_log off;
    }
}
EOF

# Enable the site
print_status "Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/docswap /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
print_status "Testing Nginx configuration..."
sudo nginx -t

# Create systemd service for cleanup
print_status "Creating cleanup service..."
sudo tee /etc/systemd/system/docswap-cleanup.service > /dev/null << EOF
[Unit]
Description=DocSwap File Cleanup Service
After=network.target

[Service]
Type=oneshot
User=$USER
WorkingDirectory=/var/www/docswap
Environment=PATH=/var/www/docswap/venv/bin
ExecStart=/var/www/docswap/venv/bin/python cleanup_files.py
EOF

sudo tee /etc/systemd/system/docswap-cleanup.timer > /dev/null << EOF
[Unit]
Description=Run DocSwap cleanup every hour
Requires=docswap-cleanup.service

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Enable and start services
print_status "Enabling and starting services..."
sudo systemctl daemon-reload
sudo systemctl enable docswap-cleanup.timer
sudo systemctl start docswap-cleanup.timer

# Update Supervisor and start the application
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start docswap

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Create a simple health check script
print_status "Creating health check script..."
cat > health_check.sh << EOF
#!/bin/bash
echo "🏥 DocSwap Health Check"
echo "======================"
echo "Application Status:"
sudo supervisorctl status docswap
echo ""
echo "Nginx Status:"
sudo systemctl status nginx --no-pager -l
echo ""
echo "Disk Usage:"
df -h /var/www/docswap
echo ""
echo "Memory Usage:"
free -h
echo ""
echo "Application Logs (last 10 lines):"
tail -n 10 /var/www/docswap/logs/supervisor.log
EOF

chmod +x health_check.sh

# Create backup script
print_status "Creating backup script..."
cat > backup.sh << EOF
#!/bin/bash
BACKUP_DIR="/var/backups/docswap"
DATE=\$(date +%Y%m%d_%H%M%S)
sudo mkdir -p \$BACKUP_DIR
sudo tar -czf \$BACKUP_DIR/docswap_backup_\$DATE.tar.gz \
    --exclude='venv' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='logs/*.log' \
    /var/www/docswap
echo "Backup created: \$BACKUP_DIR/docswap_backup_\$DATE.tar.gz"
EOF

chmod +x backup.sh

# Final status check
print_status "Performing final status check..."
sleep 5

if sudo supervisorctl status docswap | grep -q "RUNNING"; then
    print_success "✅ DocSwap application is running!"
else
    print_error "❌ DocSwap application failed to start"
    print_status "Checking logs..."
    tail -n 20 /var/www/docswap/logs/supervisor.log
fi

if sudo systemctl is-active --quiet nginx; then
    print_success "✅ Nginx is running!"
else
    print_error "❌ Nginx failed to start"
fi

# Display final information
echo ""
echo "🎉 DocSwap Deployment Complete!"
echo "================================"
echo ""
echo "📁 Application Directory: /var/www/docswap"
echo "🌐 Nginx Config: /etc/nginx/sites-available/docswap"
echo "⚙️  Supervisor Config: /etc/supervisor/conf.d/docswap.conf"
echo "📋 Environment File: /var/www/docswap/.env"
echo ""
echo "🔧 Management Commands:"
echo "  Start:   sudo supervisorctl start docswap"
echo "  Stop:    sudo supervisorctl stop docswap"
echo "  Restart: sudo supervisorctl restart docswap"
echo "  Status:  sudo supervisorctl status docswap"
echo "  Logs:    tail -f /var/www/docswap/logs/supervisor.log"
echo ""
echo "🏥 Health Check: ./health_check.sh"
echo "💾 Backup: ./backup.sh"
echo ""
print_warning "⚠️  IMPORTANT: Update the following before going live:"
echo "  1. Update .env file with your actual Supabase credentials"
echo "  2. Update Nginx config with your actual domain name"
echo "  3. Set up SSL certificate (Let's Encrypt recommended)"
echo "  4. Configure firewall (UFW recommended)"
echo ""
print_success "🚀 Your DocSwap application should now be accessible!"
echo "   Visit: http://your-server-ip"
echo ""