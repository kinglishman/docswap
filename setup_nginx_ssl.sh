#!/bin/bash

# Nginx and SSL Setup Script for DocSwap
# Usage: ./setup_nginx_ssl.sh yourdomain.com

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if domain is provided
if [ -z "$1" ]; then
    print_error "Usage: $0 yourdomain.com"
    exit 1
fi

DOMAIN=$1

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

print_status "Setting up Nginx configuration for domain: $DOMAIN"

# Remove default site if it exists
rm -f /etc/nginx/sites-enabled/default

# Create Nginx configuration
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
        alias /var/www/docswap/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/docswap /etc/nginx/sites-enabled/

# Test Nginx configuration
print_status "Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    print_success "Nginx configuration is valid"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Restart Nginx
print_status "Restarting Nginx..."
systemctl restart nginx

print_status "Installing Certbot for SSL..."
apt install -y certbot python3-certbot-nginx

print_status "Obtaining SSL certificate for $DOMAIN..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

if [ $? -eq 0 ]; then
    print_success "SSL certificate obtained and configured successfully!"
else
    print_error "SSL certificate setup failed. You may need to configure it manually."
fi

# Test SSL renewal
print_status "Testing SSL certificate renewal..."
certbot renew --dry-run

print_success "Nginx and SSL setup completed for $DOMAIN!"

echo ""
echo "🎉 Your website should now be accessible at:"
echo "   https://$DOMAIN"
echo "   https://www.$DOMAIN"
echo ""
echo "📋 Next steps:"
echo "1. Update your .env file with ALLOWED_ORIGINS=https://$DOMAIN,https://www.$DOMAIN"
echo "2. Configure Supabase CORS settings to include your domain"
echo "3. Test your application functionality"
echo ""
echo "🔧 Useful commands:"
echo "  Check Nginx status: systemctl status nginx"
echo "  Check SSL status: certbot certificates"
echo "  Renew SSL: certbot renew"