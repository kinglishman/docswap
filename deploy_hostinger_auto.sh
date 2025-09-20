#!/bin/bash

# DocSwap Automated Hostinger VPS Deployment Script
# Zero-downtime deployment with rollback capability
# Author: Senior Developer Assistant
# Version: 1.0

set -e  # Exit on any error

# Configuration
DOMAIN="${DOMAIN:-yourdomain.com}"
VPS_IP="${VPS_IP:-your.vps.ip.address}"
VPS_USER="${VPS_USER:-root}"
SSH_KEY="${SSH_KEY:-~/.ssh/id_rsa}"
APP_NAME="docswap"
APP_DIR="/var/www/$APP_NAME"
BACKUP_DIR="/var/backups/$APP_NAME"
NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"
SUPERVISOR_CONF="/etc/supervisor/conf.d/$APP_NAME.conf"
PYTHON_VERSION="3.11"

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

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if SSH key exists
    if [[ ! -f "$SSH_KEY" ]]; then
        error "SSH key not found at $SSH_KEY"
        exit 1
    fi
    
    # Check if git repository is clean
    if [[ -n $(git status --porcelain) ]]; then
        warning "Git repository has uncommitted changes"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Check required environment variables
    if [[ -z "$VPS_IP" || "$VPS_IP" == "your.vps.ip.address" ]]; then
        error "Please set VPS_IP environment variable"
        exit 1
    fi
    
    log "Prerequisites check passed"
}

# Test SSH connection
test_ssh() {
    log "Testing SSH connection to $VPS_USER@$VPS_IP..."
    if ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes "$VPS_USER@$VPS_IP" exit; then
        log "SSH connection successful"
    else
        error "SSH connection failed"
        exit 1
    fi
}

# Initial server setup
setup_server() {
    log "Setting up server environment..."
    
    ssh -i "$SSH_KEY" "$VPS_USER@$VPS_IP" << 'EOF'
        # Update system
        apt update && apt upgrade -y
        
        # Install required packages
        apt install -y python3 python3-pip python3-venv nginx supervisor git curl wget
        apt install -y build-essential python3-dev libffi-dev libssl-dev
        apt install -y libjpeg-dev zlib1g-dev libtiff-dev libfreetype6-dev
        apt install -y poppler-utils tesseract-ocr
        
        # Install Node.js (for any frontend build tools)
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt install -y nodejs
        
        # Create application user
        if ! id "docswap" &>/dev/null; then
            useradd -m -s /bin/bash docswap
            usermod -aG www-data docswap
        fi
        
        # Create directories
        mkdir -p /var/www/docswap
        mkdir -p /var/backups/docswap
        mkdir -p /var/log/docswap
        
        # Set permissions
        chown -R docswap:www-data /var/www/docswap
        chown -R docswap:www-data /var/log/docswap
        chmod -R 755 /var/www/docswap
EOF
    
    log "Server setup completed"
}

# Deploy application
deploy_app() {
    log "Deploying application..."
    
    # Create deployment timestamp
    DEPLOY_TIME=$(date +%Y%m%d_%H%M%S)
    RELEASE_DIR="$APP_DIR/releases/$DEPLOY_TIME"
    
    ssh -i "$SSH_KEY" "$VPS_USER@$VPS_IP" << EOF
        # Create release directory
        mkdir -p $RELEASE_DIR
        cd $RELEASE_DIR
        
        # Clone repository
        git clone https://github.com/yourusername/docswap.git .
        
        # Create virtual environment
        python3 -m venv venv
        source venv/bin/activate
        
        # Install dependencies
        pip install --upgrade pip
        pip install -r requirements.txt
        
        # Create production environment file
        cp .env.production.template .env.production
        
        # Set proper permissions
        chown -R docswap:www-data $RELEASE_DIR
        chmod +x $RELEASE_DIR/*.sh
        
        # Create symlink to current release
        rm -f $APP_DIR/current
        ln -sf $RELEASE_DIR $APP_DIR/current
EOF
    
    log "Application deployed to $RELEASE_DIR"
}

# Configure Nginx
configure_nginx() {
    log "Configuring Nginx..."
    
    ssh -i "$SSH_KEY" "$VPS_USER@$VPS_IP" << EOF
        # Create Nginx configuration
        cat > $NGINX_CONF << 'NGINX_EOF'
upstream docswap_app {
    server 127.0.0.1:5002;
    keepalive 32;
}

server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL Configuration (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # File upload limits
    client_max_body_size 100M;
    client_body_timeout 60s;
    client_header_timeout 60s;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Static files
    location /static/ {
        alias $APP_DIR/current/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /css/ {
        alias $APP_DIR/current/css/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /js/ {
        alias $APP_DIR/current/js/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check
    location /health {
        proxy_pass http://docswap_app;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        access_log off;
    }
    
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
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    
    # Rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://docswap_app;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX_EOF
        
        # Enable site
        ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
        
        # Test Nginx configuration
        nginx -t
        
        # Add rate limiting to nginx.conf if not present
        if ! grep -q "limit_req_zone" /etc/nginx/nginx.conf; then
            sed -i '/http {/a\\tlimit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;' /etc/nginx/nginx.conf
        fi
EOF
    
    log "Nginx configured"
}

# Configure Supervisor
configure_supervisor() {
    log "Configuring Supervisor..."
    
    ssh -i "$SSH_KEY" "$VPS_USER@$VPS_IP" << EOF
        # Create Supervisor configuration
        cat > $SUPERVISOR_CONF << 'SUPERVISOR_EOF'
[program:docswap]
command=$APP_DIR/current/venv/bin/gunicorn --config $APP_DIR/current/gunicorn.conf.py app:app
directory=$APP_DIR/current
user=docswap
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/docswap/app.log
stdout_logfile_maxbytes=50MB
stdout_logfile_backups=10
environment=PATH="$APP_DIR/current/venv/bin"

[program:docswap-cleanup]
command=$APP_DIR/current/venv/bin/python cleanup_files.py
directory=$APP_DIR/current
user=docswap
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/docswap/cleanup.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=5
environment=PATH="$APP_DIR/current/venv/bin"
SUPERVISOR_EOF
        
        # Update supervisor
        supervisorctl reread
        supervisorctl update
EOF
    
    log "Supervisor configured"
}

# Setup SSL with Let's Encrypt
setup_ssl() {
    log "Setting up SSL certificate..."
    
    ssh -i "$SSH_KEY" "$VPS_USER@$VPS_IP" << EOF
        # Install Certbot
        apt install -y certbot python3-certbot-nginx
        
        # Stop Nginx temporarily
        systemctl stop nginx
        
        # Get SSL certificate
        certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
        
        # Start Nginx
        systemctl start nginx
        
        # Setup auto-renewal
        echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
EOF
    
    log "SSL certificate configured"
}

# Start services
start_services() {
    log "Starting services..."
    
    ssh -i "$SSH_KEY" "$VPS_USER@$VPS_IP" << 'EOF'
        # Start and enable services
        systemctl enable nginx
        systemctl enable supervisor
        
        # Restart services
        systemctl restart nginx
        systemctl restart supervisor
        
        # Start application
        supervisorctl start docswap
        supervisorctl start docswap-cleanup
        
        # Check status
        systemctl status nginx --no-pager
        systemctl status supervisor --no-pager
        supervisorctl status
EOF
    
    log "Services started"
}

# Health check
health_check() {
    log "Performing health check..."
    
    sleep 10  # Wait for services to start
    
    # Check if application is responding
    if curl -f -s "http://$VPS_IP:5002/health" > /dev/null; then
        log "Application health check passed"
    else
        error "Application health check failed"
        return 1
    fi
    
    # Check Nginx
    if ssh -i "$SSH_KEY" "$VPS_USER@$VPS_IP" "systemctl is-active nginx" > /dev/null; then
        log "Nginx is running"
    else
        error "Nginx is not running"
        return 1
    fi
    
    log "All health checks passed"
}

# Rollback function
rollback() {
    log "Rolling back to previous version..."
    
    ssh -i "$SSH_KEY" "$VPS_USER@$VPS_IP" << 'EOF'
        cd /var/www/docswap/releases
        PREVIOUS=$(ls -t | sed -n '2p')
        if [[ -n "$PREVIOUS" ]]; then
            rm -f /var/www/docswap/current
            ln -sf /var/www/docswap/releases/$PREVIOUS /var/www/docswap/current
            supervisorctl restart docswap
            echo "Rolled back to $PREVIOUS"
        else
            echo "No previous version found"
            exit 1
        fi
EOF
}

# Cleanup old releases
cleanup_releases() {
    log "Cleaning up old releases..."
    
    ssh -i "$SSH_KEY" "$VPS_USER@$VPS_IP" << 'EOF'
        cd /var/www/docswap/releases
        # Keep only the last 5 releases
        ls -t | tail -n +6 | xargs -r rm -rf
EOF
    
    log "Old releases cleaned up"
}

# Main deployment function
main() {
    log "Starting DocSwap deployment to Hostinger VPS..."
    
    # Parse command line arguments
    case "${1:-deploy}" in
        "setup")
            check_prerequisites
            test_ssh
            setup_server
            deploy_app
            configure_nginx
            configure_supervisor
            setup_ssl
            start_services
            health_check
            ;;
        "deploy")
            check_prerequisites
            test_ssh
            deploy_app
            start_services
            if ! health_check; then
                warning "Health check failed, rolling back..."
                rollback
                exit 1
            fi
            cleanup_releases
            ;;
        "rollback")
            rollback
            ;;
        "health")
            health_check
            ;;
        *)
            echo "Usage: $0 {setup|deploy|rollback|health}"
            echo "  setup   - Initial server setup and deployment"
            echo "  deploy  - Deploy new version"
            echo "  rollback - Rollback to previous version"
            echo "  health  - Check application health"
            exit 1
            ;;
    esac
    
    log "Deployment completed successfully!"
    info "Your DocSwap application is now available at: https://$DOMAIN"
}

# Run main function
main "$@"