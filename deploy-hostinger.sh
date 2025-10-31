#!/bin/bash
# DocSwap VPS Deployment Script
# Run on Ubuntu 20.04/22.04

set -e  # Exit on any error

echo "=========================================="
echo "DocSwap VPS Deployment Starting"
echo "=========================================="

# Update system
echo "[1/15] Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Python 3.9 and pip
echo "[2/15] Installing Python 3.9..."
sudo apt install -y python3.9 python3.9-venv python3-pip git

# Install nginx
echo "[3/15] Installing nginx..."
sudo apt install -y nginx

# Install certbot for SSL
echo "[4/15] Installing certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Install LibreOffice (optional, for advanced conversions)
echo "[5/15] Installing LibreOffice..."
sudo apt install -y libreoffice libreoffice-writer libreoffice-calc

# Create application directory
echo "[6/15] Setting up application directory..."
sudo mkdir -p /var/www/docswap
sudo chown $USER:$USER /var/www/docswap
cd /var/www/docswap

# Clone repository
echo "[7/15] Cloning repository..."
if [ -d "/var/www/docswap/.git" ]; then
    echo "Repository already exists, pulling latest..."
    git pull origin main
else
    git clone https://github.com/kinglishman/docswap.git .
fi

# Create Python virtual environment
echo "[8/15] Creating Python virtual environment..."
python3.9 -m venv venv

# Activate virtual environment and install dependencies
echo "[9/15] Installing Python dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file template
echo "[10/15] Creating environment configuration..."
cat > .env << 'ENVEOF'
SECRET_KEY=CHANGE_THIS_SECRET_KEY_TO_RANDOM_STRING
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-public-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-here
MAX_FILE_SIZE=104857600
FILE_EXPIRY=86400
RATE_LIMIT_PER_MINUTE=60
FLASK_ENV=production
UPLOAD_FOLDER=/var/www/docswap/uploads
OUTPUT_FOLDER=/var/www/docswap/output
SESSIONS_FOLDER=/var/www/docswap/sessions
ENVEOF

# Create data directories
echo "[11/15] Creating data directories..."
mkdir -p uploads output sessions
chmod 755 uploads output sessions

# Create systemd service
echo "[12/15] Creating systemd service..."
sudo tee /etc/systemd/system/docswap.service > /dev/null << SERVICEEOF
[Unit]
Description=DocSwap Flask Application
After=network.target

[Service]
User=$USER
WorkingDirectory=/var/www/docswap
Environment="PATH=/var/www/docswap/venv/bin"
EnvironmentFile=/var/www/docswap/.env
ExecStart=/var/www/docswap/venv/bin/gunicorn app:app --bind 127.0.0.1:8000 --workers 2 --timeout 120 --access-logfile /var/www/docswap/access.log --error-logfile /var/www/docswap/error.log
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICEEOF

# Configure nginx
echo "[13/15] Configuring nginx..."
sudo tee /etc/nginx/sites-available/docswap > /dev/null << 'NGINXEOF'
server {
    listen 80;
    server_name www.mydocswap.com mydocswap.com;

    client_max_body_size 100M;
    client_body_timeout 300s;
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static {
        alias /var/www/docswap/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

# Enable nginx site
sudo ln -sf /etc/nginx/sites-available/docswap /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
echo "[14/15] Testing nginx configuration..."
sudo nginx -t

# Start services
echo "[15/15] Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable docswap
sudo systemctl start docswap
sudo systemctl reload nginx

# Configure firewall
echo "Configuring firewall..."
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw --force enable

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "⚠️  NEXT STEPS (REQUIRED):"
echo ""
echo "1. Edit credentials:"
echo "   nano /var/www/docswap/.env"
echo "   (Replace ALL placeholder values with your actual Supabase credentials)"
echo ""
echo "2. Restart the service:"
echo "   sudo systemctl restart docswap"
echo ""
echo "3. Check service status:"
echo "   sudo systemctl status docswap"
echo ""
echo "4. View logs if needed:"
echo "   sudo journalctl -u docswap -f"
echo ""
echo "5. Point DNS A record to this server:"
echo "   www.mydocswap.com → 31.97.193.96"
echo "   mydocswap.com → 31.97.193.96"
echo ""
echo "6. After DNS propagates (5-10 min), setup SSL:"
echo "   sudo certbot --nginx -d www.mydocswap.com -d mydocswap.com"
echo ""
echo "Your app will be live at: https://www.mydocswap.com"
echo "=========================================="