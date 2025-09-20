# 🚀 DocSwap VPS Performance Optimization Guide

## 📊 **Performance Benchmarks by VPS Size**

### **1GB RAM VPS (Basic)**
- **Concurrent Users**: 10-20
- **File Processing**: Up to 50MB files
- **Response Time**: 300-500ms
- **Monthly Cost**: ~$3-5
- **Best For**: Personal use, testing

### **2GB RAM VPS (Recommended)**
- **Concurrent Users**: 30-50
- **File Processing**: Up to 100MB files
- **Response Time**: 200-300ms
- **Monthly Cost**: ~$6-10
- **Best For**: Small business, moderate traffic

### **4GB RAM VPS (High Performance)**
- **Concurrent Users**: 80-120
- **File Processing**: Up to 200MB files
- **Response Time**: 100-200ms
- **Monthly Cost**: ~$12-20
- **Best For**: High traffic, enterprise use

### **8GB RAM VPS (Enterprise)**
- **Concurrent Users**: 150-250
- **File Processing**: Up to 500MB files
- **Response Time**: 50-100ms
- **Monthly Cost**: ~$25-40
- **Best For**: Heavy workloads, multiple applications

---

## ⚡ **Performance Optimization Strategies**

### **1. Application-Level Optimizations**

#### **A. Gunicorn Configuration**
```python
# Optimal worker calculation: (2 x CPU cores) + 1
# For 2 CPU cores: 5 workers
# For 4 CPU cores: 9 workers

# /var/www/docswap/app/gunicorn.conf.py
workers = 4  # Adjust based on CPU cores
worker_class = "gevent"  # Async workers for better I/O
worker_connections = 1000
max_requests = 1000  # Restart workers after 1000 requests
max_requests_jitter = 50  # Add randomness to prevent thundering herd
preload_app = True  # Load app before forking workers
```

#### **B. Python Optimizations**
```bash
# Environment variables for performance
export PYTHONUNBUFFERED=1  # Disable output buffering
export PYTHONDONTWRITEBYTECODE=1  # Don't create .pyc files
export PYTHONHASHSEED=random  # Randomize hash seed for security

# Use faster JSON library
pip install orjson  # 2-3x faster than standard json

# Use faster template engine
pip install jinja2[i18n]  # Optimized Jinja2
```

#### **C. File Processing Optimizations**
```python
# In your Flask app, add these optimizations:

# 1. Async file processing
from concurrent.futures import ThreadPoolExecutor
import asyncio

# 2. Memory-efficient file handling
def process_large_file(file_path):
    # Process in chunks instead of loading entire file
    chunk_size = 8192
    with open(file_path, 'rb') as f:
        while chunk := f.read(chunk_size):
            # Process chunk
            pass

# 3. Temporary file cleanup
import tempfile
import atexit

def cleanup_temp_files():
    # Clean up temporary files on exit
    pass

atexit.register(cleanup_temp_files)
```

### **2. System-Level Optimizations**

#### **A. Memory Management**
```bash
# Optimize swap usage
echo 'vm.swappiness=10' >> /etc/sysctl.conf

# Increase file descriptor limits
echo '* soft nofile 65536' >> /etc/security/limits.conf
echo '* hard nofile 65536' >> /etc/security/limits.conf

# Optimize memory allocation
echo 'vm.overcommit_memory=1' >> /etc/sysctl.conf
```

#### **B. CPU Optimizations**
```bash
# Set CPU governor to performance
echo 'performance' | tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Optimize process scheduling
echo 'kernel.sched_migration_cost_ns=5000000' >> /etc/sysctl.conf
```

#### **C. I/O Optimizations**
```bash
# Optimize disk I/O
echo 'vm.dirty_ratio=15' >> /etc/sysctl.conf
echo 'vm.dirty_background_ratio=5' >> /etc/sysctl.conf

# Use faster I/O scheduler for SSD
echo 'deadline' > /sys/block/vda/queue/scheduler  # For VPS with SSD
```

### **3. Network Optimizations**

#### **A. Nginx Performance Tuning**
```nginx
# /etc/nginx/nginx.conf optimizations
worker_processes auto;  # Use all CPU cores
worker_connections 1024;  # Connections per worker

# Enable efficient file serving
sendfile on;
tcp_nopush on;
tcp_nodelay on;

# Optimize keepalive
keepalive_timeout 65;
keepalive_requests 100;

# Enable compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_comp_level 6;
gzip_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/javascript
    application/xml+rss
    application/json;

# Buffer optimizations
client_body_buffer_size 128k;
client_max_body_size 100m;
client_header_buffer_size 1k;
large_client_header_buffers 4 4k;
output_buffers 1 32k;
postpone_output 1460;
```

#### **B. TCP Optimizations**
```bash
# Network performance tuning
cat >> /etc/sysctl.conf << 'EOF'
# TCP optimizations
net.core.somaxconn = 1024
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 1024
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_intvl = 60
net.ipv4.tcp_keepalive_probes = 10
net.ipv4.tcp_fin_timeout = 30

# Buffer sizes
net.core.rmem_default = 262144
net.core.rmem_max = 16777216
net.core.wmem_default = 262144
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 65536 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
EOF

sysctl -p
```

### **4. Database Optimizations (Supabase)**

#### **A. Connection Pooling**
```python
# Use connection pooling for better performance
import psycopg2.pool

# Create connection pool
connection_pool = psycopg2.pool.ThreadedConnectionPool(
    minconn=1,
    maxconn=20,
    host="your-supabase-host",
    database="postgres",
    user="postgres",
    password="your-password"
)
```

#### **B. Query Optimizations**
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_files_created_at ON files(created_at);
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_status ON files(status);

-- Use LIMIT for large result sets
SELECT * FROM files ORDER BY created_at DESC LIMIT 50;
```

### **5. Caching Strategies**

#### **A. Redis Caching (Optional)**
```bash
# Install Redis for caching
apt install redis-server

# Configure Redis
echo 'maxmemory 256mb' >> /etc/redis/redis.conf
echo 'maxmemory-policy allkeys-lru' >> /etc/redis/redis.conf
```

```python
# Add Redis caching to your Flask app
import redis
from flask_caching import Cache

app.config['CACHE_TYPE'] = 'redis'
app.config['CACHE_REDIS_URL'] = 'redis://localhost:6379/0'
cache = Cache(app)

@cache.memoize(timeout=300)  # Cache for 5 minutes
def expensive_function():
    # Your expensive computation here
    pass
```

#### **B. File System Caching**
```bash
# Use tmpfs for temporary files (uses RAM)
mkdir -p /var/www/docswap/temp
mount -t tmpfs -o size=512M tmpfs /var/www/docswap/temp

# Make it permanent
echo 'tmpfs /var/www/docswap/temp tmpfs size=512M 0 0' >> /etc/fstab
```

### **6. Monitoring and Alerting**

#### **A. System Monitoring**
```bash
# Install monitoring tools
apt install -y htop iotop nethogs

# Create monitoring script
cat > /var/www/docswap/performance_monitor.sh << 'EOF'
#!/bin/bash

LOG_FILE="/var/www/docswap/logs/performance.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# CPU usage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)

# Memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.2f", $3/$2 * 100.0)}')

# Disk usage
DISK_USAGE=$(df /var/www/docswap | tail -1 | awk '{print $5}' | cut -d'%' -f1)

# Active connections
CONNECTIONS=$(netstat -an | grep :80 | wc -l)

# Log metrics
echo "$DATE,CPU:$CPU_USAGE%,Memory:$MEMORY_USAGE%,Disk:$DISK_USAGE%,Connections:$CONNECTIONS" >> $LOG_FILE

# Alert if usage is high
if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    echo "HIGH CPU USAGE: $CPU_USAGE%" | logger -t docswap-monitor
fi

if (( $(echo "$MEMORY_USAGE > 85" | bc -l) )); then
    echo "HIGH MEMORY USAGE: $MEMORY_USAGE%" | logger -t docswap-monitor
fi
EOF

chmod +x /var/www/docswap/performance_monitor.sh

# Run every 5 minutes
echo "*/5 * * * * /var/www/docswap/performance_monitor.sh" | crontab -
```

#### **B. Application Performance Monitoring**
```python
# Add performance monitoring to your Flask app
import time
from functools import wraps

def monitor_performance(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = time.time()
        result = f(*args, **kwargs)
        end_time = time.time()
        
        # Log slow requests (> 1 second)
        if end_time - start_time > 1.0:
            app.logger.warning(f"Slow request: {f.__name__} took {end_time - start_time:.2f}s")
        
        return result
    return decorated_function

# Use on your routes
@app.route('/upload')
@monitor_performance
def upload_file():
    # Your upload logic here
    pass
```

### **7. Security Optimizations**

#### **A. Rate Limiting**
```nginx
# Advanced rate limiting in Nginx
http {
    # Define rate limiting zones
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;
    
    # Connection limiting
    limit_conn_zone $binary_remote_addr zone=conn_limit_per_ip:10m;
    limit_conn conn_limit_per_ip 10;
}
```

#### **B. DDoS Protection**
```bash
# Install and configure fail2ban
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/error.log
findtime = 600
bantime = 7200
maxretry = 10
EOF

systemctl restart fail2ban
```

### **8. Backup and Recovery Optimizations**

#### **A. Incremental Backups**
```bash
# Create incremental backup script
cat > /var/www/docswap/incremental_backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/var/www/docswap/backups"
FULL_BACKUP_DIR="$BACKUP_DIR/full"
INCREMENTAL_DIR="$BACKUP_DIR/incremental"
DATE=$(date +%Y%m%d_%H%M%S)

# Create directories
mkdir -p $FULL_BACKUP_DIR $INCREMENTAL_DIR

# Full backup on Sundays, incremental on other days
if [ $(date +%u) -eq 7 ]; then
    # Full backup
    tar -czf "$FULL_BACKUP_DIR/full_backup_$DATE.tar.gz" \
        --exclude="/var/www/docswap/app/venv" \
        --exclude="/var/www/docswap/app/uploads" \
        /var/www/docswap/app
    
    # Remove old incremental backups
    rm -f $INCREMENTAL_DIR/*
else
    # Incremental backup
    find /var/www/docswap/app -newer $FULL_BACKUP_DIR/$(ls -t $FULL_BACKUP_DIR | head -1) \
        -not -path "*/venv/*" -not -path "*/uploads/*" \
        | tar -czf "$INCREMENTAL_DIR/incremental_$DATE.tar.gz" -T -
fi

# Keep only last 4 full backups
ls -t $FULL_BACKUP_DIR/*.tar.gz | tail -n +5 | xargs rm -f
EOF

chmod +x /var/www/docswap/incremental_backup.sh
```

---

## 📈 **Performance Testing**

### **Load Testing with Apache Bench**
```bash
# Install Apache Bench
apt install apache2-utils

# Test concurrent users
ab -n 1000 -c 10 http://yourdomain.com/

# Test file upload
ab -n 100 -c 5 -p test_file.pdf -T application/pdf http://yourdomain.com/upload
```

### **Monitoring During Load Tests**
```bash
# Monitor system during tests
watch -n 1 'echo "=== CPU ===" && top -bn1 | head -5 && echo "=== Memory ===" && free -h && echo "=== Connections ===" && netstat -an | grep :80 | wc -l'
```

---

## 🎯 **Performance Checklist**

### **Before Going Live:**
- [ ] Optimize Gunicorn worker count based on CPU cores
- [ ] Configure Nginx with compression and caching
- [ ] Set up proper logging and log rotation
- [ ] Configure system limits and kernel parameters
- [ ] Set up monitoring and alerting
- [ ] Test with realistic load
- [ ] Configure backups
- [ ] Set up SSL with HTTP/2
- [ ] Configure rate limiting
- [ ] Optimize database queries

### **After Going Live:**
- [ ] Monitor performance metrics daily
- [ ] Review logs for errors and slow requests
- [ ] Optimize based on real usage patterns
- [ ] Scale resources as needed
- [ ] Update dependencies regularly
- [ ] Test backup and recovery procedures

---

## 🚨 **Troubleshooting Performance Issues**

### **High CPU Usage**
```bash
# Find CPU-intensive processes
top -o %CPU

# Check if workers are optimal
ps aux | grep gunicorn

# Reduce worker count if needed
# Edit /var/www/docswap/app/gunicorn.conf.py
```

### **High Memory Usage**
```bash
# Check memory usage by process
ps aux --sort=-%mem | head

# Check for memory leaks
valgrind --tool=memcheck python app.py

# Restart application if needed
supervisorctl restart docswap
```

### **Slow Response Times**
```bash
# Check application logs
tail -f /var/www/docswap/logs/supervisor.log

# Monitor network connections
netstat -tulpn | grep :5000

# Check disk I/O
iotop
```

### **Database Performance Issues**
```sql
-- Check slow queries in Supabase
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check active connections
SELECT count(*) FROM pg_stat_activity;
```

This comprehensive performance guide will help you get the maximum performance from your DocSwap deployment on Hostinger VPS! 🚀