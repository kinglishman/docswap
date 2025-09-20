# DocSwap Deployment Guide for Hostinger

## Prerequisites

1. **Hostinger VPS or Cloud Hosting Plan** (Shared hosting won't work for Python Flask apps)
2. **Domain name** configured with Hostinger
3. **Supabase account** with project set up
4. **SSH access** to your Hostinger server

## Step 1: Server Setup

### 1.1 Connect to Your Server
```bash
ssh root@your-server-ip
```

### 1.2 Update System
```bash
apt update && apt upgrade -y
```

### 1.3 Install Required Software
```bash
# Install Python 3.11 and pip
apt install python3.11 python3.11-pip python3.11-venv -y

# Install additional dependencies
apt install nginx supervisor git curl -y

# Install system dependencies for PDF processing
apt install poppler-utils tesseract-ocr libreoffice -y
```

## Step 2: Application Deployment

### 2.1 Create Application Directory
```bash
mkdir -p /var/www/docswap
cd /var/www/docswap
```

### 2.2 Clone or Upload Your Application
```bash
# Option 1: Using Git (recommended)
git clone https://github.com/yourusername/docswap.git .

# Option 2: Upload files via SCP/SFTP
# Upload all files to /var/www/docswap/
```

### 2.3 Set Up Python Virtual Environment
```bash
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 2.4 Configure Environment Variables
```bash
# Copy production environment template
cp .env.production .env

# Edit the .env file with your actual values
nano .env
```

**Important: Update these values in .env:**
- `SECRET_KEY`: Generate a secure random key
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Your service role key
- `SUPABASE_ANON_KEY`: Your anon/public key
- `SUPABASE_JWT_SECRET`: Your JWT secret
- `ALLOWED_ORIGINS`: Your domain (https://yourdomain.com)
- `ADMIN_PASSWORD`: Secure admin password

### 2.5 Set Proper Permissions
```bash
chown -R www-data:www-data /var/www/docswap
chmod -R 755 /var/www/docswap
chmod 600 /var/www/docswap/.env
```

## Step 3: Configure Gunicorn

### 3.1 Create Gunicorn Configuration
```bash
nano /var/www/docswap/gunicorn.conf.py
```

Add this content:
```python
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
```

### 3.2 Test Gunicorn
```bash
cd /var/www/docswap
source venv/bin/activate
gunicorn --config gunicorn.conf.py app:app
```

## Step 4: Configure Supervisor

### 4.1 Create Supervisor Configuration
```bash
nano /etc/supervisor/conf.d/docswap.conf
```

Add this content:
```ini
[program:docswap]
command=/var/www/docswap/venv/bin/gunicorn --config /var/www/docswap/gunicorn.conf.py app:app
directory=/var/www/docswap
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/docswap.log
environment=PATH="/var/www/docswap/venv/bin"
```

### 4.2 Start Supervisor
```bash
supervisorctl reread
supervisorctl update
supervisorctl start docswap
supervisorctl status
```

## Step 5: Configure Nginx

### 5.1 Create Nginx Configuration
```bash
nano /etc/nginx/sites-available/docswap
```

Add this content:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    location /static {
        alias /var/www/docswap/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 5.2 Enable Site
```bash
ln -s /etc/nginx/sites-available/docswap /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

## Step 6: SSL Certificate (Let's Encrypt)

### 6.1 Install Certbot
```bash
apt install certbot python3-certbot-nginx -y
```

### 6.2 Obtain SSL Certificate
```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Step 7: Configure Firewall

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## Step 8: Set Up Monitoring and Maintenance

### 8.1 Create Log Rotation
```bash
nano /etc/logrotate.d/docswap
```

Add:
```
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
```

### 8.2 Set Up Automatic Updates
```bash
# Add to crontab
crontab -e

# Add these lines:
0 2 * * 0 apt update && apt upgrade -y
0 3 * * * supervisorctl restart docswap
```

## Step 9: Supabase Configuration

### 9.1 Update CORS Settings
1. Go to Supabase Dashboard → Project Settings → API
2. Add your domain to CORS allowed origins:
   - `https://yourdomain.com`
   - `https://www.yourdomain.com`

### 9.2 Configure Authentication Providers
1. Go to Authentication → Providers
2. Enable Email provider
3. Configure Google OAuth (if needed):
   - Add redirect URI: `https://yourdomain.com`

## Step 10: Testing and Verification

### 10.1 Test Application
```bash
# Check if application is running
curl http://localhost:5000

# Check logs
tail -f /var/log/docswap.log
supervisorctl status docswap
```

### 10.2 Test from Browser
1. Visit `https://yourdomain.com`
2. Test file upload and conversion
3. Test user authentication
4. Check admin panel at `https://yourdomain.com/admin`

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   - Check if Gunicorn is running: `supervisorctl status docswap`
   - Check logs: `tail -f /var/log/docswap.log`

2. **File Upload Errors**
   - Check disk space: `df -h`
   - Verify permissions: `ls -la /var/www/docswap/uploads`

3. **Authentication Issues**
   - Verify Supabase configuration
   - Check CORS settings
   - Verify environment variables

### Useful Commands

```bash
# Restart application
supervisorctl restart docswap

# View logs
tail -f /var/log/docswap.log

# Check Nginx status
systemctl status nginx

# Test Nginx configuration
nginx -t

# Update application
cd /var/www/docswap
git pull
source venv/bin/activate
pip install -r requirements.txt
supervisorctl restart docswap
```

## Security Checklist

- [ ] Strong SECRET_KEY set
- [ ] Admin password changed
- [ ] Firewall configured
- [ ] SSL certificate installed
- [ ] File permissions set correctly
- [ ] Environment variables secured
- [ ] Regular backups configured
- [ ] Log monitoring set up

## Backup Strategy

### 8.1 Database Backup (Supabase handles this)
- Supabase automatically backs up your database
- Consider exporting important data regularly

### 8.2 Application Backup
```bash
# Create backup script
nano /root/backup-docswap.sh

#!/bin/bash
tar -czf /root/docswap-backup-$(date +%Y%m%d).tar.gz /var/www/docswap
find /root -name "docswap-backup-*.tar.gz" -mtime +7 -delete

# Make executable and add to cron
chmod +x /root/backup-docswap.sh
echo "0 1 * * * /root/backup-docswap.sh" | crontab -
```

## Support

If you encounter issues:
1. Check the logs first
2. Verify all configuration files
3. Test each component individually
4. Contact Hostinger support for server-related issues
5. Check Supabase status for authentication issues

Your DocSwap application should now be successfully deployed on Hostinger!