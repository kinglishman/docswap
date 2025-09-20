# 🚀 DocSwap Production Deployment Guide

Complete guide for deploying DocSwap to Hostinger VPS with automated CI/CD, monitoring, and security.

## 📋 Prerequisites

### 1. Hostinger VPS Requirements
- **VPS Plan**: Business or higher (2GB+ RAM recommended)
- **OS**: Ubuntu 20.04 LTS or 22.04 LTS
- **Domain**: Pointed to your VPS IP address
- **SSH Access**: Root or sudo user access

### 2. Required Accounts & Services
- GitHub account (for CI/CD)
- Domain registrar access (for DNS configuration)
- Email service (for alerts)
- Slack workspace (optional, for notifications)

### 3. Local Development Setup
```bash
# Clone your repository
git clone https://github.com/yourusername/docswap.git
cd docswap

# Install dependencies
pip install -r requirements.txt

# Test locally
python app.py
```

## 🔧 Quick Start Deployment

### Option 1: Automated Deployment (Recommended)

1. **Configure Environment Variables**:
```bash
# Set your deployment variables
export VPS_IP="your.vps.ip.address"
export VPS_USER="root"  # or your sudo user
export DOMAIN="yourdomain.com"
export EMAIL="admin@yourdomain.com"

# Optional: Cloudflare integration
export CLOUDFLARE_API_TOKEN="your_cloudflare_token"
export ENABLE_CLOUDFLARE="true"
```

2. **Run Automated Deployment**:
```bash
# Make scripts executable
chmod +x deploy_hostinger_auto.sh
chmod +x setup_domain_ssl.sh
chmod +x monitoring_setup.sh

# Deploy to production
./deploy_hostinger_auto.sh deploy
```

3. **Setup Domain & SSL**:
```bash
# Configure domain and SSL certificates
./setup_domain_ssl.sh setup
```

4. **Setup Monitoring**:
```bash
# Install comprehensive monitoring
./monitoring_setup.sh setup
```

### Option 2: Manual Step-by-Step Deployment

#### Step 1: Server Preparation
```bash
# Connect to your VPS
ssh root@your.vps.ip.address

# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y python3 python3-pip python3-venv nginx supervisor git
apt install -y poppler-utils tesseract-ocr libjpeg-dev zlib1g-dev
```

#### Step 2: Application Setup
```bash
# Create application directory
mkdir -p /opt/docswap
cd /opt/docswap

# Clone repository
git clone https://github.com/yourusername/docswap.git .

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install gunicorn
```

#### Step 3: Configuration
```bash
# Copy production environment template
cp .env.production.template .env

# Edit environment variables
nano .env
# Configure all required variables (see Environment Variables section)
```

#### Step 4: Nginx Configuration
```bash
# Copy nginx configuration
cp nginx/docswap.conf /etc/nginx/sites-available/yourdomain.com
ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/

# Test and reload nginx
nginx -t
systemctl reload nginx
```

#### Step 5: Supervisor Configuration
```bash
# Copy supervisor configuration
cp supervisor/docswap.conf /etc/supervisor/conf.d/

# Update and start supervisor
supervisorctl reread
supervisorctl update
supervisorctl start docswap
```

#### Step 6: SSL Certificate
```bash
# Install certbot
apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 🔐 Environment Variables

Create `.env` file with the following variables:

```bash
# Flask Configuration
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=your-super-secret-key-here
WTF_CSRF_SECRET_KEY=another-secret-key

# Server Configuration
HOST=0.0.0.0
PORT=5000
WORKERS=4

# Security
SECURITY_PASSWORD_SALT=your-password-salt
SESSION_COOKIE_SECURE=True
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE=Lax

# Database (if using)
DATABASE_URL=postgresql://user:password@localhost/docswap

# File Storage
UPLOAD_FOLDER=/opt/docswap/uploads
MAX_CONTENT_LENGTH=52428800
ALLOWED_EXTENSIONS=pdf,doc,docx,txt,rtf,odt

# Email Configuration
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# Monitoring
ENABLE_MONITORING=True
METRICS_ENDPOINT=/metrics
HEALTH_CHECK_ENDPOINT=/health

# Rate Limiting
RATELIMIT_STORAGE_URL=memory://
RATELIMIT_DEFAULT=100 per hour

# Logging
LOG_LEVEL=INFO
LOG_FILE=/var/log/docswap/app.log
```

## 🔄 CI/CD Setup with GitHub Actions

### 1. Repository Secrets Configuration

Add the following secrets to your GitHub repository:

```
# Production Environment
PRODUCTION_VPS_IP=your.vps.ip.address
PRODUCTION_VPS_USER=root
PRODUCTION_SSH_KEY=your-private-ssh-key
PRODUCTION_DOMAIN=yourdomain.com

# Staging Environment (optional)
STAGING_VPS_IP=staging.vps.ip.address
STAGING_VPS_USER=root
STAGING_SSH_KEY=staging-private-ssh-key
STAGING_DOMAIN=staging.yourdomain.com

# Notifications
SLACK_WEBHOOK=https://hooks.slack.com/services/...
```

### 2. SSH Key Setup

```bash
# Generate SSH key pair (on your local machine)
ssh-keygen -t rsa -b 4096 -C "github-actions@yourdomain.com"

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/id_rsa.pub root@your.vps.ip.address

# Add private key to GitHub secrets as PRODUCTION_SSH_KEY
```

### 3. Workflow Triggers

The CI/CD pipeline automatically triggers on:
- Push to `main` branch (deploys to staging, then production)
- Pull requests (runs tests only)
- Manual workflow dispatch

## 📊 Monitoring & Maintenance

### Health Monitoring

```bash
# Check application health
curl https://yourdomain.com/health

# View monitoring dashboard
/opt/docswap-monitoring/scripts/dashboard.sh

# Manual health check
/opt/docswap-monitoring/scripts/health_check.sh
```

### Log Management

```bash
# Application logs
tail -f /var/log/docswap/app.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System logs
journalctl -u supervisor -f
```

### Performance Monitoring

```bash
# Run performance test
/opt/docswap-monitoring/scripts/performance_monitor.sh

# Analyze logs
/opt/docswap-monitoring/scripts/log_analyzer.sh

# System resources
htop
iotop
```

### Backup & Recovery

```bash
# Create backup
./deploy_hostinger_auto.sh backup

# List backups
ls -la /var/backups/docswap/

# Restore from backup
./deploy_hostinger_auto.sh restore backup_filename.tar.gz
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Application Won't Start
```bash
# Check supervisor status
supervisorctl status docswap

# Check logs
tail -f /var/log/supervisor/docswap.log

# Restart application
supervisorctl restart docswap
```

#### 2. SSL Certificate Issues
```bash
# Check certificate status
certbot certificates

# Renew certificate
certbot renew

# Test renewal
certbot renew --dry-run
```

#### 3. High Resource Usage
```bash
# Check system resources
htop
free -h
df -h

# Check application processes
ps aux | grep gunicorn
```

#### 4. Database Connection Issues
```bash
# Check database status (if using PostgreSQL)
systemctl status postgresql

# Test database connection
psql -h localhost -U username -d docswap
```

### Performance Optimization

#### 1. Nginx Optimization
```bash
# Edit nginx configuration
nano /etc/nginx/sites-available/yourdomain.com

# Add caching headers
location /static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

#### 2. Application Optimization
```bash
# Increase Gunicorn workers
nano /etc/supervisor/conf.d/docswap.conf
# command=/opt/docswap/venv/bin/gunicorn --workers 4 --bind 127.0.0.1:5000 app:app
```

#### 3. System Optimization
```bash
# Optimize system limits
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf
```

## 🔒 Security Best Practices

### 1. Server Security
```bash
# Configure firewall
ufw allow ssh
ufw allow http
ufw allow https
ufw enable

# Disable root login (after setting up sudo user)
nano /etc/ssh/sshd_config
# PermitRootLogin no
systemctl restart ssh
```

### 2. Application Security
- Keep dependencies updated
- Use strong secret keys
- Enable HTTPS only
- Implement rate limiting
- Regular security audits

### 3. Monitoring Security
```bash
# Check failed login attempts
grep "Failed password" /var/log/auth.log

# Monitor suspicious activity
tail -f /var/log/nginx/access.log | grep -E "40[0-9]|50[0-9]"
```

## 📈 Scaling Considerations

### Horizontal Scaling
- Load balancer setup
- Multiple application servers
- Shared file storage
- Database clustering

### Vertical Scaling
- Increase VPS resources
- Optimize application code
- Database performance tuning
- Caching implementation

## 🆘 Support & Maintenance

### Regular Maintenance Tasks
- [ ] Weekly: Review monitoring reports
- [ ] Monthly: Update dependencies
- [ ] Monthly: Review and rotate logs
- [ ] Quarterly: Security audit
- [ ] Quarterly: Performance review

### Emergency Procedures
1. **Application Down**: Check supervisor, restart if needed
2. **High Load**: Scale resources, check for issues
3. **Security Breach**: Isolate, investigate, patch
4. **Data Loss**: Restore from backup, investigate cause

### Getting Help
- Check logs first: `/var/log/docswap/`
- Review monitoring reports: `/opt/docswap-monitoring/reports/`
- Run diagnostics: `./deploy_hostinger_auto.sh diagnose`

---

## 📞 Quick Reference

### Essential Commands
```bash
# Application Management
supervisorctl status docswap
supervisorctl restart docswap
supervisorctl stop docswap
supervisorctl start docswap

# Nginx Management
systemctl status nginx
systemctl restart nginx
nginx -t

# SSL Management
certbot certificates
certbot renew

# Monitoring
/opt/docswap-monitoring/scripts/dashboard.sh
tail -f /var/log/docswap/app.log

# Deployment
./deploy_hostinger_auto.sh deploy
./deploy_hostinger_auto.sh rollback
```

### Important Paths
- Application: `/opt/docswap/`
- Logs: `/var/log/docswap/`
- Nginx Config: `/etc/nginx/sites-available/yourdomain.com`
- Supervisor Config: `/etc/supervisor/conf.d/docswap.conf`
- SSL Certificates: `/etc/letsencrypt/live/yourdomain.com/`
- Monitoring: `/opt/docswap-monitoring/`

---

*This deployment guide ensures a production-ready, secure, and monitored DocSwap application on Hostinger VPS.*