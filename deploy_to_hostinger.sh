#!/bin/bash

# DocSwap Hostinger Deployment Automation Script
# Run this script on your Hostinger server after uploading your files

set -e  # Exit on any error

echo "🚀 Starting DocSwap deployment on Hostinger..."

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
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

print_status "Updating system packages..."
apt update && apt upgrade -y

print_status "Installing required packages..."
apt install -y python3.11 python3.11-pip python3.11-venv nginx supervisor git curl
apt install -y poppler-utils tesseract-ocr libreoffice build-essential python3.11-dev

print_status "Creating application directory..."
mkdir -p /var/www/docswap
cd /var/www/docswap

# Check if app.py exists
if [ ! -f "app.py" ]; then
    print_error "app.py not found! Please upload your application files first."
    exit 1
fi

print_status "Setting up Python virtual environment..."
python3.11 -m venv venv
source venv/bin/activate

print_status "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn

print_status "Creating Gunicorn configuration..."
cat > gunicorn.conf.py << 'EOF'
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
EOF

print_status "Setting up Supervisor configuration..."
cat > /etc/supervisor/conf.d/docswap.conf << 'EOF'
[program:docswap]
command=/var/www/docswap/venv/bin/gunicorn --config /var/www/docswap/gunicorn.conf.py app:app
directory=/var/www/docswap
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/docswap.log
environment=PATH="/var/www/docswap/venv/bin"
EOF

print_status "Setting proper permissions..."
chown -R www-data:www-data /var/www/docswap
chmod -R 755 /var/www/docswap
chmod 600 /var/www/docswap/.env 2>/dev/null || print_warning ".env file not found - you'll need to create it manually"

print_status "Starting Supervisor..."
supervisorctl reread
supervisorctl update
supervisorctl start docswap

print_status "Configuring log rotation..."
cat > /etc/logrotate.d/docswap << 'EOF'
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
EOF

print_status "Setting up firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable

print_success "Basic deployment completed!"

echo ""
echo "🔧 NEXT STEPS:"
echo "1. Create your .env file with production settings"
echo "2. Configure Nginx for your domain"
echo "3. Set up SSL certificate with Let's Encrypt"
echo "4. Configure Supabase CORS settings"
echo ""
echo "📋 USEFUL COMMANDS:"
echo "  Check status: supervisorctl status docswap"
echo "  View logs: tail -f /var/log/docswap.log"
echo "  Restart app: supervisorctl restart docswap"
echo ""
print_success "Deployment script completed successfully!"