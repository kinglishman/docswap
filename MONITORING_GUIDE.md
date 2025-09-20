# DocSwap Monitoring & Admin Portal Guide

This guide covers how to monitor your DocSwap application performance and use the admin portal effectively after deployment.

## Admin Portal Overview

The DocSwap admin portal provides comprehensive monitoring and management capabilities for your application. It includes:

- **Real-time System Metrics**: CPU, memory, disk usage monitoring
- **File Management**: View, search, and manage uploaded files
- **Health Monitoring**: Application and database health checks
- **Activity Logs**: Track user actions and system events
- **Cleanup Tools**: Automated file cleanup and maintenance
- **Security Monitoring**: Track failed login attempts and suspicious activity

## Accessing the Admin Portal

### 1. Admin Portal URL
```
https://yourdomain.com/admin
```

### 2. Default Credentials
- **Username**: Set in `ADMIN_USERNAME` environment variable
- **Password**: Set in `ADMIN_PASSWORD` environment variable

⚠️ **Security Note**: Change the default admin password immediately after deployment!

### 3. Setting Up Admin Credentials

Update your `.env` file:
```bash
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_secure_password_here
ADMIN_SESSION_TIMEOUT=3600  # Session timeout in seconds
```

## Dashboard Features

### System Metrics
The dashboard displays real-time metrics:

- **CPU Usage**: Current processor utilization
- **Memory Usage**: RAM consumption percentage
- **Disk Usage**: Storage space utilization
- **Total Files**: Number of files in the system

### Health Indicators
- 🟢 **Green**: System operating normally
- 🟡 **Yellow**: Warning - attention needed
- 🔴 **Red**: Critical - immediate action required

### Recent Activity
Monitor user actions including:
- File uploads
- File conversions
- Failed operations
- IP addresses and timestamps

## File Management

### File Overview
The Files section provides:
- Complete file listing with search and filters
- File type, size, and upload time information
- Session tracking and IP address logging
- File status (Active, Expired, Converted)

### File Operations
- **View Files**: Preview uploaded files
- **Download Converted Files**: Access processed documents
- **Delete Files**: Remove individual or multiple files
- **Bulk Operations**: Select and manage multiple files

### File Cleanup
Automated cleanup options:
- Files older than 24 hours
- Files older than 3 days
- Files older than 1 week
- Custom time periods

## Monitoring Best Practices

### 1. Regular Health Checks
- Check the dashboard daily for system health
- Monitor CPU and memory usage trends
- Watch for disk space warnings

### 2. Performance Thresholds

#### CPU Usage
- **Normal**: < 60%
- **Warning**: 60-80%
- **Critical**: > 80%

#### Memory Usage
- **Normal**: < 70%
- **Warning**: 70-85%
- **Critical**: > 85%

#### Disk Usage
- **Normal**: < 75%
- **Warning**: 75-90%
- **Critical**: > 90%

### 3. File Management
- Clean up expired files regularly
- Monitor file upload patterns
- Check for unusual file sizes or types

## API Endpoints for Monitoring

### Health Check
```bash
GET /admin/api/health
```
Returns system health status and component checks.

### System Metrics
```bash
GET /admin/api/metrics
```
Returns real-time system performance metrics.

### System Alerts
```bash
GET /admin/api/alerts
```
Returns current system alerts and warnings.

## Automated Monitoring Setup

### 1. External Monitoring Tools

You can integrate external monitoring services:

#### Uptime Monitoring
- **Pingdom**: Monitor application availability
- **UptimeRobot**: Free uptime monitoring
- **StatusCake**: Website monitoring service

#### Server Monitoring
- **New Relic**: Application performance monitoring
- **DataDog**: Infrastructure monitoring
- **Prometheus + Grafana**: Open-source monitoring stack

### 2. Health Check Integration

Set up automated health checks:

```bash
# Simple health check script
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" https://yourdomain.com/admin/api/health)
if [ $response != "200" ]; then
    echo "Health check failed with status: $response"
    # Send alert (email, Slack, etc.)
fi
```

### 3. Log Monitoring

Monitor application logs:

```bash
# Monitor error logs
tail -f /var/log/docswap/error.log | grep -i error

# Monitor access logs
tail -f /var/log/nginx/access.log | grep -v "200"
```

## Alert Configuration

### System Alerts
The admin portal automatically generates alerts for:
- High CPU usage (> 80%)
- High memory usage (> 85%)
- Low disk space (> 90%)
- Database connection issues
- File system errors

### Custom Alerts
You can extend the monitoring system by adding custom alerts in `admin.py`:

```python
def check_custom_metrics():
    alerts = []
    
    # Example: Check file upload rate
    recent_uploads = get_recent_uploads(hours=1)
    if len(recent_uploads) > 100:
        alerts.append({
            'type': 'warning',
            'title': 'High Upload Rate',
            'message': f'{len(recent_uploads)} files uploaded in the last hour'
        })
    
    return alerts
```

## Troubleshooting Common Issues

### High CPU Usage
1. Check for stuck processes
2. Review recent file conversions
3. Monitor concurrent users
4. Consider scaling resources

### High Memory Usage
1. Restart the application
2. Check for memory leaks
3. Review file processing queue
4. Increase server memory

### Disk Space Issues
1. Run file cleanup immediately
2. Check log file sizes
3. Review backup storage
4. Increase disk capacity

### Database Connection Issues
1. Check Supabase service status
2. Verify connection credentials
3. Review network connectivity
4. Check rate limits

## Security Monitoring

### Failed Login Attempts
Monitor the admin portal for:
- Multiple failed login attempts
- Login attempts from unusual IP addresses
- Brute force attack patterns

### File Upload Monitoring
Watch for:
- Unusual file types or sizes
- High upload frequency from single IPs
- Suspicious file names or content

### Access Logs
Regularly review:
- Admin portal access logs
- API endpoint usage patterns
- Error rate trends

## Backup and Recovery

### Database Backups
Ensure regular Supabase backups:
1. Enable automatic backups in Supabase dashboard
2. Test backup restoration procedures
3. Monitor backup success/failure

### File Backups
Implement file backup strategy:
1. Regular file system backups
2. Cloud storage synchronization
3. Disaster recovery procedures

## Performance Optimization

### Based on Monitoring Data

1. **High File Processing Time**
   - Optimize conversion algorithms
   - Implement file processing queue
   - Add more processing workers

2. **Database Performance**
   - Optimize database queries
   - Add database indexes
   - Consider read replicas

3. **Network Performance**
   - Implement CDN for file delivery
   - Optimize file compression
   - Use caching strategies

## Maintenance Schedule

### Daily Tasks
- [ ] Check system health dashboard
- [ ] Review error logs
- [ ] Monitor disk space

### Weekly Tasks
- [ ] Clean up expired files
- [ ] Review performance trends
- [ ] Check security logs
- [ ] Update system metrics baseline

### Monthly Tasks
- [ ] Review and update monitoring thresholds
- [ ] Analyze usage patterns
- [ ] Plan capacity upgrades
- [ ] Security audit

## Getting Help

If you encounter issues:

1. **Check the Admin Dashboard**: Look for system alerts and health indicators
2. **Review Logs**: Check application and server logs for errors
3. **Monitor Resources**: Ensure adequate CPU, memory, and disk space
4. **Test Components**: Use health check endpoints to isolate issues
5. **Contact Support**: Reach out with specific error messages and system metrics

## Advanced Configuration

### Custom Metrics
Add custom monitoring metrics by extending the `get_system_metrics()` function in `admin.py`.

### Integration with External Tools
The admin API endpoints can be integrated with external monitoring tools like Prometheus, Grafana, or custom dashboards.

### Scaling Considerations
As your application grows, consider:
- Load balancing multiple application instances
- Database read replicas
- Distributed file storage
- Microservices architecture

This monitoring setup ensures you can maintain optimal performance and quickly identify and resolve issues in your DocSwap application.