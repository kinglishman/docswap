#!/bin/bash

# 🌐 DocSwap Domain & SSL Setup Script for Hostinger
# Automates domain configuration and SSL certificate setup

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/docswap-ssl-setup.log"
BACKUP_DIR="/var/backups/docswap"

# Default values (can be overridden by environment variables)
DOMAIN="${DOMAIN:-your-domain.com}"
EMAIL="${EMAIL:-admin@your-domain.com}"
VPS_IP="${VPS_IP:-your-vps-ip}"
CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
ENABLE_CLOUDFLARE="${ENABLE_CLOUDFLARE:-false}"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
    fi
}

check_dependencies() {
    log "Checking dependencies..."
    
    local deps=("nginx" "certbot" "dig" "curl")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            warning "$dep not found, installing..."
            case "$dep" in
                "nginx")
                    apt-get update && apt-get install -y nginx
                    ;;
                "certbot")
                    apt-get update && apt-get install -y certbot python3-certbot-nginx
                    ;;
                "dig")
                    apt-get update && apt-get install -y dnsutils
                    ;;
                "curl")
                    apt-get update && apt-get install -y curl
                    ;;
            esac
        fi
    done
    
    log "All dependencies are available"
}

validate_domain() {
    log "Validating domain configuration..."
    
    if [[ -z "$DOMAIN" || "$DOMAIN" == "your-domain.com" ]]; then
        error "Please set a valid DOMAIN environment variable"
    fi
    
    if [[ -z "$EMAIL" || "$EMAIL" == "admin@your-domain.com" ]]; then
        error "Please set a valid EMAIL environment variable"
    fi
    
    # Check if domain resolves to our VPS IP
    local resolved_ip
    resolved_ip=$(dig +short "$DOMAIN" | tail -n1)
    
    if [[ -z "$resolved_ip" ]]; then
        warning "Domain $DOMAIN does not resolve to any IP"
        return 1
    fi
    
    if [[ "$resolved_ip" != "$VPS_IP" ]]; then
        warning "Domain $DOMAIN resolves to $resolved_ip, but VPS IP is $VPS_IP"
        warning "Please update your DNS records to point to $VPS_IP"
        return 1
    fi
    
    log "Domain validation successful: $DOMAIN -> $VPS_IP"
    return 0
}

setup_cloudflare_dns() {
    if [[ "$ENABLE_CLOUDFLARE" != "true" || -z "$CLOUDFLARE_API_TOKEN" ]]; then
        info "Cloudflare DNS setup skipped"
        return 0
    fi
    
    log "Setting up Cloudflare DNS..."
    
    # Install Cloudflare certbot plugin
    apt-get update && apt-get install -y python3-certbot-dns-cloudflare
    
    # Create Cloudflare credentials file
    cat > /etc/letsencrypt/cloudflare.ini << EOF
dns_cloudflare_api_token = $CLOUDFLARE_API_TOKEN
EOF
    
    chmod 600 /etc/letsencrypt/cloudflare.ini
    
    log "Cloudflare DNS setup completed"
}

create_nginx_config() {
    log "Creating Nginx configuration for $DOMAIN..."
    
    # Backup existing config if it exists
    if [[ -f "/etc/nginx/sites-available/$DOMAIN" ]]; then
        cp "/etc/nginx/sites-available/$DOMAIN" "$BACKUP_DIR/nginx-$DOMAIN-$(date +%Y%m%d-%H%M%S).conf"
    fi
    
    # Create initial HTTP-only configuration
    cat > "/etc/nginx/sites-available/$DOMAIN" << EOF
# DocSwap Nginx Configuration for $DOMAIN
# Generated on $(date)

# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=upload:10m rate=2r/s;

# Upstream for DocSwap application
upstream docswap_app {
    server 127.0.0.1:5000;
    keepalive 32;
}

# HTTP server (will redirect to HTTPS after SSL setup)
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }
    
    # Temporary location for initial setup
    location / {
        proxy_pass http://docswap_app;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # API endpoints with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://docswap_app;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Upload endpoints with stricter rate limiting
    location /upload {
        limit_req zone=upload burst=5 nodelay;
        
        client_max_body_size 50M;
        proxy_pass http://docswap_app;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Extended timeouts for file uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # Static files
    location /static/ {
        alias /opt/docswap/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check
    location /health {
        proxy_pass http://docswap_app;
        access_log off;
    }
}
EOF
    
    # Enable the site
    ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
    
    # Remove default site if it exists
    rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    nginx -t || error "Nginx configuration test failed"
    
    # Reload Nginx
    systemctl reload nginx
    
    log "Nginx configuration created and enabled"
}

obtain_ssl_certificate() {
    log "Obtaining SSL certificate for $DOMAIN..."
    
    # Ensure web root exists
    mkdir -p /var/www/html
    
    local certbot_cmd
    if [[ "$ENABLE_CLOUDFLARE" == "true" && -n "$CLOUDFLARE_API_TOKEN" ]]; then
        # Use Cloudflare DNS challenge
        certbot_cmd="certbot certonly --dns-cloudflare --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini"
    else
        # Use HTTP challenge
        certbot_cmd="certbot certonly --webroot -w /var/www/html"
    fi
    
    # Run certbot
    $certbot_cmd \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --domains "$DOMAIN,www.$DOMAIN" \
        --non-interactive || error "Failed to obtain SSL certificate"
    
    log "SSL certificate obtained successfully"
}

update_nginx_ssl() {
    log "Updating Nginx configuration with SSL..."
    
    # Create SSL-enabled configuration
    cat > "/etc/nginx/sites-available/$DOMAIN" << EOF
# DocSwap Nginx Configuration for $DOMAIN with SSL
# Generated on $(date)

# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=upload:10m rate=2r/s;

# Upstream for DocSwap application
upstream docswap_app {
    server 127.0.0.1:5000;
    keepalive 32;
}

# HTTP server - redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/$DOMAIN/chain.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';" always;
    
    # Main application
    location / {
        proxy_pass http://docswap_app;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # API endpoints with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://docswap_app;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Upload endpoints with stricter rate limiting
    location /upload {
        limit_req zone=upload burst=5 nodelay;
        
        client_max_body_size 50M;
        proxy_pass http://docswap_app;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Extended timeouts for file uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # Static files
    location /static/ {
        alias /opt/docswap/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check
    location /health {
        proxy_pass http://docswap_app;
        access_log off;
    }
    
    # Security.txt
    location /.well-known/security.txt {
        return 200 "Contact: $EMAIL\nExpires: $(date -d '+1 year' --iso-8601)\nPreferred-Languages: en\n";
        add_header Content-Type text/plain;
    }
}
EOF
    
    # Test Nginx configuration
    nginx -t || error "Nginx SSL configuration test failed"
    
    # Reload Nginx
    systemctl reload nginx
    
    log "Nginx SSL configuration updated successfully"
}

setup_ssl_renewal() {
    log "Setting up SSL certificate auto-renewal..."
    
    # Create renewal hook script
    cat > /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh << 'EOF'
#!/bin/bash
systemctl reload nginx
EOF
    
    chmod +x /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh
    
    # Test renewal
    certbot renew --dry-run || warning "SSL renewal test failed"
    
    log "SSL auto-renewal configured"
}

verify_ssl() {
    log "Verifying SSL configuration..."
    
    # Wait for Nginx to reload
    sleep 5
    
    # Test HTTPS connection
    if curl -sSf "https://$DOMAIN/health" > /dev/null; then
        log "✅ HTTPS connection successful"
    else
        error "❌ HTTPS connection failed"
    fi
    
    # Test SSL grade (basic check)
    local ssl_info
    ssl_info=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates)
    log "SSL Certificate info: $ssl_info"
    
    # Test HTTP to HTTPS redirect
    local redirect_status
    redirect_status=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN/")
    if [[ "$redirect_status" == "301" ]]; then
        log "✅ HTTP to HTTPS redirect working"
    else
        warning "❌ HTTP to HTTPS redirect not working (status: $redirect_status)"
    fi
}

create_monitoring_script() {
    log "Creating SSL monitoring script..."
    
    cat > /usr/local/bin/check-ssl-expiry.sh << EOF
#!/bin/bash

# SSL Certificate Expiry Checker for $DOMAIN

DOMAIN="$DOMAIN"
EMAIL="$EMAIL"
DAYS_BEFORE_EXPIRY=30

# Get certificate expiry date
EXPIRY_DATE=\$(echo | openssl s_client -servername "\$DOMAIN" -connect "\$DOMAIN:443" 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
EXPIRY_TIMESTAMP=\$(date -d "\$EXPIRY_DATE" +%s)
CURRENT_TIMESTAMP=\$(date +%s)
DAYS_UNTIL_EXPIRY=\$(( (\$EXPIRY_TIMESTAMP - \$CURRENT_TIMESTAMP) / 86400 ))

if [[ \$DAYS_UNTIL_EXPIRY -lt \$DAYS_BEFORE_EXPIRY ]]; then
    echo "WARNING: SSL certificate for \$DOMAIN expires in \$DAYS_UNTIL_EXPIRY days (\$EXPIRY_DATE)"
    # Send email notification (if mail is configured)
    if command -v mail &> /dev/null; then
        echo "SSL certificate for \$DOMAIN expires in \$DAYS_UNTIL_EXPIRY days" | mail -s "SSL Certificate Expiry Warning" "\$EMAIL"
    fi
else
    echo "SSL certificate for \$DOMAIN is valid for \$DAYS_UNTIL_EXPIRY more days"
fi
EOF
    
    chmod +x /usr/local/bin/check-ssl-expiry.sh
    
    # Add to crontab (check daily at 2 AM)
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/check-ssl-expiry.sh") | crontab -
    
    log "SSL monitoring script created and scheduled"
}

show_summary() {
    log "🎉 Domain and SSL setup completed successfully!"
    echo
    echo "📋 Summary:"
    echo "  Domain: $DOMAIN"
    echo "  SSL Certificate: ✅ Active"
    echo "  HTTPS Redirect: ✅ Enabled"
    echo "  Security Headers: ✅ Configured"
    echo "  Auto-renewal: ✅ Scheduled"
    echo
    echo "🔗 URLs:"
    echo "  Website: https://$DOMAIN"
    echo "  Health Check: https://$DOMAIN/health"
    echo "  API Config: https://$DOMAIN/api/config"
    echo
    echo "📁 Important Files:"
    echo "  Nginx Config: /etc/nginx/sites-available/$DOMAIN"
    echo "  SSL Certificates: /etc/letsencrypt/live/$DOMAIN/"
    echo "  Logs: $LOG_FILE"
    echo
    echo "🔧 Next Steps:"
    echo "  1. Test your website: https://$DOMAIN"
    echo "  2. Monitor SSL expiry: /usr/local/bin/check-ssl-expiry.sh"
    echo "  3. Check logs: tail -f $LOG_FILE"
}

# Main execution
main() {
    log "Starting DocSwap Domain & SSL Setup..."
    
    # Create necessary directories
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$(dirname "$LOG_FILE")"
    
    check_root
    check_dependencies
    
    if validate_domain; then
        setup_cloudflare_dns
        create_nginx_config
        obtain_ssl_certificate
        update_nginx_ssl
        setup_ssl_renewal
        verify_ssl
        create_monitoring_script
        show_summary
    else
        error "Domain validation failed. Please check your DNS configuration."
    fi
}

# Command line interface
case "${1:-setup}" in
    "setup")
        main
        ;;
    "renew")
        log "Renewing SSL certificate..."
        certbot renew
        systemctl reload nginx
        ;;
    "check")
        /usr/local/bin/check-ssl-expiry.sh
        ;;
    "verify")
        verify_ssl
        ;;
    *)
        echo "Usage: $0 {setup|renew|check|verify}"
        echo "  setup  - Complete domain and SSL setup"
        echo "  renew  - Renew SSL certificate"
        echo "  check  - Check SSL certificate expiry"
        echo "  verify - Verify SSL configuration"
        exit 1
        ;;
esac