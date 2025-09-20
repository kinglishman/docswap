# DocSwap Production Deployment Guide

This guide provides step-by-step instructions for deploying DocSwap to a production server with optimal performance, security, and reliability.

## 🚀 Quick Start

For a rapid deployment, use our automated script:

```bash
# On your production server (as root)
sudo ./start_production.sh setup
sudo ./start_production.sh start
```

## 📋 Prerequisites

### Server Requirements

- **OS**: Ubuntu 20.04+ or Debian 11+ (recommended)
- **RAM**: Minimum 2GB, recommended 4GB+
- **Storage**: Minimum 20GB, recommended 50GB+
- **CPU**: 2+ cores recommended
- **Network**: Public IP address and domain name (optional but recommended)

### Required System Packages

The deployment script will install these automatically:

- Python 3.11+
- Nginx
- Supervisor
- Poppler-utils (PDF processing)
- Tesseract-OCR (text recognition)
- LibreOffice (document conversion)
- UFW (firewall)
- Fail2ban (intrusion prevention)

## 🔧 Manual Deployment Steps

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y python3.11 python3.11-pip python3.11-venv \
    nginx supervisor poppler-utils tesseract-ocr libreoffice \
    ufw fail2ban git curl wget

# Create application user
sudo useradd -m -s /bin/bash docswap
sudo usermod -aG www-data docswap
```

### 2. Application Setup

```bash
# Create application directory
sudo mkdir -p /var/www/docswap
sudo chown docswap:docswap /var/www/docswap

# Copy application files
sudo cp -r /path/to/your/docswap/* /var/www/docswap/
sudo chown -R docswap:docswap /var/www/docswap

# Create required directories
sudo mkdir -p /var/log/docswap
sudo chown docswap:docswap /var/log/docswap
```

### 3. Python Environment

```bash
# Switch to application user
sudo su - docswap

# Create virtual environment
cd /var/www/docswap
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

# Exit back to root
exit
```

### 4. Environment Configuration

```bash
# Copy and configure environment file
sudo cp /var/www/docswap/.env.production.optimized /var/www/docswap/.env
sudo nano /var/www/docswap/.env
```

**Required Environment Variables:**

```env
# Flask Configuration
FLASK_ENV=production
SECRET_KEY=your-super-secret-key-here
DEBUG=False

# Server Configuration
HOST=0.0.0.0
PORT=5000

# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-supabase-service-key

# Security
ALLOWED_ORIGINS=https://yourdomain.com
RATE_LIMIT_ENABLED=True
RATE_LIMIT_PER_MINUTE=60

# File Upload
MAX_FILE_SIZE_MB=50
UPLOAD_FOLDER=/var/www/docswap/uploads
OUTPUT_FOLDER=/var/www/docswap/output

# Admin Portal
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-admin-password
```

### 5. Nginx Configuration

```bash
# Copy Nginx configuration
sudo cp /var/www/docswap/nginx.conf /etc/nginx/sites-available/docswap

# Update domain name in configuration
sudo nano /etc/nginx/sites-available/docswap
# Replace 'your-domain.com' with your actual domain

# Enable site
sudo ln -s /etc/nginx/sites-available/docswap /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Supervisor Configuration

```bash
# Copy Supervisor configuration
sudo cp /var/www/docswap/supervisor.conf /etc/supervisor/conf.d/docswap.conf

# Update and start services
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start docswap-services:*
```

### 7. Firewall Configuration

```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Configure Fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## 🔒 Security Hardening

### SSL/TLS Certificate (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Additional Security Measures

```bash
# Secure file permissions
sudo chmod 600 /var/www/docswap/.env
sudo chmod -R 755 /var/www/docswap
sudo chmod +x /var/www/docswap/*.py
sudo chmod +x /var/www/docswap/*.sh

# Disable root SSH (optional)
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart ssh
```

## 📊 Monitoring and Maintenance

### Log Files

- **Application**: `/var/log/docswap/gunicorn_error.log`
- **Access**: `/var/log/docswap/gunicorn_access.log`
- **Nginx**: `/var/log/nginx/docswap_error.log`
- **Supervisor**: `/var/log/docswap/supervisor.log`
- **Cleanup**: `/var/log/docswap/cleanup.log`

### Service Management

```bash
# Check application status
sudo ./start_production.sh status

# Restart application
sudo ./start_production.sh restart

# View logs
sudo tail -f /var/log/docswap/gunicorn_error.log

# Supervisor commands
sudo supervisorctl status
sudo supervisorctl restart docswap-services:*
```

### Performance Monitoring

```bash
# Check system resources
htop
df -h
free -h

# Check application performance
curl -I http://localhost:5000/health

# Monitor Nginx
sudo tail -f /var/log/nginx/docswap_access.log
```

## 🔧 Troubleshooting

### Common Issues

1. **Application won't start**
   ```bash
   # Check logs
   sudo tail -f /var/log/docswap/gunicorn_error.log
   
   # Verify environment
   sudo su - docswap -c "cd /var/www/docswap && source venv/bin/activate && python -c 'import app'"
   ```

2. **File upload issues**
   ```bash
   # Check permissions
   ls -la /var/www/docswap/uploads/
   
   # Check disk space
   df -h
   ```

3. **Nginx errors**
   ```bash
   # Test configuration
   sudo nginx -t
   
   # Check error logs
   sudo tail -f /var/log/nginx/error.log
   ```

### Performance Tuning

1. **Increase worker processes** (edit `gunicorn.conf.py`):
   ```python
   workers = multiprocessing.cpu_count() * 2 + 1
   ```

2. **Adjust memory limits** (edit `.env`):
   ```env
   MEMORY_LIMIT_MB=1024
   MAX_REQUESTS=2000
   ```

3. **Optimize Nginx** (edit `nginx.conf`):
   ```nginx
   worker_processes auto;
   worker_connections 2048;
   ```

## 🚀 Scaling Considerations

### Horizontal Scaling

- Use a load balancer (HAProxy, AWS ALB)
- Deploy multiple application instances
- Shared file storage (NFS, S3)
- External database (PostgreSQL cluster)

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize worker processes
- Use faster storage (SSD)

## 📈 Performance Benchmarks

| Server Size | Concurrent Users | File Processing | Response Time | Monthly Cost |
|-------------|------------------|-----------------|---------------|--------------|
| 1GB RAM     | 10-20           | 5-10 files/min  | 200-500ms     | $5-10        |
| 2GB RAM     | 20-50           | 15-25 files/min | 150-300ms     | $10-20       |
| 4GB RAM     | 50-100          | 30-50 files/min | 100-200ms     | $20-40       |
| 8GB RAM     | 100-200         | 60-100 files/min| 50-150ms      | $40-80       |

## 🆘 Support

For deployment issues:

1. Check the logs in `/var/log/docswap/`
2. Verify all environment variables are set correctly
3. Ensure all system dependencies are installed
4. Test the application locally first

## 📝 Deployment Checklist

- [ ] Server meets minimum requirements
- [ ] All system packages installed
- [ ] Application files copied and permissions set
- [ ] Python virtual environment created
- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] Nginx configured and tested
- [ ] Supervisor configured and running
- [ ] Firewall configured
- [ ] SSL certificate installed (if applicable)
- [ ] Monitoring and logging verified
- [ ] Backup strategy implemented

## 🔄 Updates and Maintenance

### Application Updates

```bash
# Stop services
sudo supervisorctl stop docswap-services:*

# Update code
cd /var/www/docswap
sudo -u docswap git pull origin main

# Update dependencies
sudo -u docswap bash -c "source venv/bin/activate && pip install -r requirements.txt"

# Restart services
sudo supervisorctl start docswap-services:*
```

### System Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Restart services if needed
sudo systemctl restart nginx
sudo supervisorctl restart docswap-services:*
```

---

**🎉 Congratulations!** Your DocSwap application is now running in production with enterprise-grade performance, security, and reliability.