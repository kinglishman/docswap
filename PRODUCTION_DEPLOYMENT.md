# DocSwap Production Deployment Guide

This guide covers the essential steps to deploy DocSwap securely in a production environment.

## 🔒 Critical Security Steps

### 1. Environment Configuration

**Create and configure your `.env` file:**

```bash
# Copy the example file
cp .env.example .env

# Edit with your actual values
nano .env
```

**Required Environment Variables:**

```bash
# Flask Configuration
FLASK_SECRET_KEY=your-super-secret-key-here-min-32-chars
FLASK_ENV=production
FLASK_DEBUG=False

# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-public-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-here

# File Upload Configuration
MAX_FILE_SIZE=52428800  # 50MB in bytes
FILE_EXPIRY=3600        # 1 hour in seconds

# Security Configuration
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
RATE_LIMIT_PER_MINUTE=10
```

### 2. Supabase Setup

1. **Create a Supabase Project:**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your Project URL and API keys

2. **Configure Authentication:**
   - Enable Email/Password authentication
   - Configure Google OAuth (optional)
   - Set up Row Level Security (RLS)

3. **Get Your Credentials:**
   - Project URL: `https://your-project-ref.supabase.co`
   - Anon public key: Found in Settings > API
   - Service role key: Found in Settings > API (keep secret!)
   - JWT secret: Found in Settings > API

### 3. Production Server Setup

**Install Production Dependencies:**

```bash
# Install a production WSGI server
pip install gunicorn

# Install additional security packages
pip install python-dotenv
```

**Create a Gunicorn configuration file (`gunicorn.conf.py`):**

```python
# Gunicorn configuration
bind = "0.0.0.0:5000"
workers = 4
worker_class = "sync"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 100
timeout = 30
keepalive = 2
preload_app = True

# Logging
accesslog = "/var/log/docswap/access.log"
errorlog = "/var/log/docswap/error.log"
loglevel = "info"

# Security
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190
```

**Start the application:**

```bash
# Create log directory
sudo mkdir -p /var/log/docswap
sudo chown $USER:$USER /var/log/docswap

# Start with Gunicorn
gunicorn --config gunicorn.conf.py app:app
```

### 4. Reverse Proxy Setup (Nginx)

**Install Nginx:**

```bash
sudo apt update
sudo apt install nginx
```

**Create Nginx configuration (`/etc/nginx/sites-available/docswap`):**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://your-project-ref.supabase.co;";

    # File Upload Limits
    client_max_body_size 50M;
    client_body_timeout 60s;
    client_header_timeout 60s;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=5r/m;

    location / {
        try_files $uri $uri/ @app;
    }

    location @app {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    location /api/upload {
        limit_req zone=upload burst=3 nodelay;
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Enable the site:**

```bash
sudo ln -s /etc/nginx/sites-available/docswap /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. SSL Certificate Setup

**Using Let's Encrypt (Certbot):**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 6. System Service Setup

**Create systemd service (`/etc/systemd/system/docswap.service`):**

```ini
[Unit]
Description=DocSwap Application
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/path/to/docswap
Environment=PATH=/path/to/docswap/venv/bin
EnvironmentFile=/path/to/docswap/.env
ExecStart=/path/to/docswap/venv/bin/gunicorn --config gunicorn.conf.py app:app
ExecReload=/bin/kill -s HUP $MAINPID
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

**Enable and start the service:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable docswap
sudo systemctl start docswap
sudo systemctl status docswap
```

## 🔍 Security Checklist

- [ ] Environment variables configured
- [ ] Debug mode disabled (`FLASK_DEBUG=False`)
- [ ] Strong secret key generated
- [ ] Supabase credentials secured
- [ ] HTTPS enabled with valid certificate
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] File upload limits set
- [ ] CORS properly configured
- [ ] Logging enabled
- [ ] Regular backups scheduled
- [ ] Monitoring setup

## 📊 Monitoring and Maintenance

### Log Monitoring

```bash
# Monitor application logs
tail -f /var/log/docswap/error.log
tail -f /var/log/docswap/access.log

# Monitor system logs
sudo journalctl -u docswap -f
```

### Health Checks

Add a health check endpoint to monitor application status:

```bash
# Check application health
curl -f https://yourdomain.com/api/health || echo "Application down"
```

### Backup Strategy

1. **Database Backups:** Configure Supabase automatic backups
2. **File Backups:** Implement regular file cleanup and archival
3. **Configuration Backups:** Version control your configuration files

## 🚨 Incident Response

### Common Issues

1. **High Memory Usage:** Monitor file processing and implement cleanup
2. **Rate Limiting:** Adjust limits based on usage patterns
3. **SSL Certificate Expiry:** Monitor certificate expiration dates
4. **Disk Space:** Implement file cleanup policies

### Emergency Procedures

```bash
# Stop application
sudo systemctl stop docswap

# Check logs
sudo journalctl -u docswap --since "1 hour ago"

# Restart application
sudo systemctl start docswap
```

## 📞 Support

For production deployment support:

1. Check the application logs first
2. Verify environment configuration
3. Test individual components
4. Review security settings

Remember: Security is not optional in production. Follow this guide carefully and keep your system updated.