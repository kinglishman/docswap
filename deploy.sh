#!/bin/bash

# DocSwap Deployment Script for Hostinger
# Run this script on your Hostinger server after uploading the files

set -e

echo "🚀 Starting DocSwap deployment..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script as root (use sudo)"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install required packages
echo "🔧 Installing required packages..."
apt install python3.11 python3.11-pip python3.11-venv nginx supervisor git curl -y
apt install poppler-utils tesseract-ocr libreoffice -y

# Set up application directory
echo "📁 Setting up application directory..."
APP_DIR="/var/www/docswap"
mkdir -p $APP_DIR

# If files are not already in place, prompt user
if [ ! -f "$APP_DIR/app.py" ]; then
    echo "⚠️  Please upload your DocSwap files to $APP_DIR first"
    echo "   Then run this script again"
    exit 1
fi

cd $APP_DIR

# Set up Python virtual environment
echo "🐍 Setting up Python virtual environment..."
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Set up environment file
echo "⚙️  Setting up environment configuration..."
if [ ! -f ".env" ]; then
    if [ -f ".env.production" ]; then
        cp .env.production .env
        echo "📝 Please edit .env file with your actual configuration values"
        echo "   nano $APP_DIR/.env"
        read -p "Press Enter after you've configured the .env file..."
    else
        echo "❌ No .env.production template found"
        exit 1
    fi
fi

# Set permissions
echo "🔒 Setting file permissions..."
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR
chmod 600 $APP_DIR/.env

# Create Gunicorn configuration
echo "🦄 Creating Gunicorn configuration..."
cat > $APP_DIR/gunicorn.conf.py << EOF
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

# Create Supervisor configuration
echo "👮 Creating Supervisor configuration..."
cat > /etc/supervisor/conf.d/docswap.conf << EOF
[program:docswap]
command=$APP_DIR/venv/bin/gunicorn --config $APP_DIR/gunicorn.conf.py app:app
directory=$APP_DIR
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/docswap.log
environment=PATH="$APP_DIR/venv/bin"
EOF

# Start Supervisor
echo "🔄 Starting Supervisor..."
supervisorctl reread
supervisorctl update
supervisorctl start docswap

# Get domain name from user
echo "🌐 Please enter your domain name (e.g., yourdomain.com):"
read -p "Domain: " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ Domain name is required"
    exit 1
fi

# Create Nginx configuration
echo "🌍 Creating Nginx configuration..."
cat > /etc/nginx/sites-available/docswap << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    location /static {
        alias $APP_DIR/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site
echo "✅ Enabling Nginx site..."
ln -sf /etc/nginx/sites-available/docswap /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Set up firewall
echo "🔥 Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Install SSL certificate
echo "🔐 Setting up SSL certificate..."
apt install certbot python3-certbot-nginx -y

echo "🎉 Deployment completed!"
echo ""
echo "Next steps:"
echo "1. Configure your domain DNS to point to this server"
echo "2. Run: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo "3. Update your Supabase CORS settings to include https://$DOMAIN"
echo "4. Test your application at http://$DOMAIN"
echo ""
echo "Useful commands:"
echo "- Check status: supervisorctl status docswap"
echo "- View logs: tail -f /var/log/docswap.log"
echo "- Restart app: supervisorctl restart docswap"
echo ""
echo "🚀 Your DocSwap application is now deployed!"