#!/bin/bash

# 📊 DocSwap Production Monitoring Setup
# Comprehensive monitoring, alerting, and health checks

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/docswap-monitoring.log"
MONITORING_DIR="/opt/docswap-monitoring"
ALERTS_DIR="$MONITORING_DIR/alerts"
METRICS_DIR="$MONITORING_DIR/metrics"

# Default values
DOMAIN="${DOMAIN:-localhost}"
EMAIL="${EMAIL:-admin@localhost}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
ENABLE_EMAIL_ALERTS="${ENABLE_EMAIL_ALERTS:-true}"
ENABLE_SLACK_ALERTS="${ENABLE_SLACK_ALERTS:-false}"
CHECK_INTERVAL="${CHECK_INTERVAL:-60}"  # seconds

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

install_dependencies() {
    log "Installing monitoring dependencies..."
    
    apt-get update
    apt-get install -y \
        curl \
        jq \
        bc \
        mailutils \
        htop \
        iotop \
        nethogs \
        vnstat \
        logrotate \
        fail2ban
    
    # Install Node.js for advanced monitoring (optional)
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
    fi
    
    log "Dependencies installed successfully"
}

create_monitoring_structure() {
    log "Creating monitoring directory structure..."
    
    mkdir -p "$MONITORING_DIR"/{scripts,config,logs,alerts,metrics,backups}
    mkdir -p /var/log/docswap
    
    # Set permissions
    chown -R root:root "$MONITORING_DIR"
    chmod -R 755 "$MONITORING_DIR"
    
    log "Monitoring structure created"
}

create_health_check_script() {
    log "Creating comprehensive health check script..."
    
    cat > "$MONITORING_DIR/scripts/health_check.sh" << 'EOF'
#!/bin/bash

# DocSwap Health Check Script
# Performs comprehensive application health monitoring

DOMAIN="${DOMAIN:-localhost}"
EMAIL="${EMAIL:-admin@localhost}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
LOG_FILE="/var/log/docswap/health_check.log"
METRICS_FILE="/opt/docswap-monitoring/metrics/health_metrics.json"
ALERT_FILE="/opt/docswap-monitoring/alerts/last_alert.txt"

# Health check endpoints
ENDPOINTS=(
    "https://$DOMAIN/health"
    "https://$DOMAIN/api/config"
    "https://$DOMAIN/"
)

# Thresholds
MAX_RESPONSE_TIME=5000  # milliseconds
MIN_DISK_SPACE=1000000  # KB (1GB)
MAX_CPU_USAGE=80        # percentage
MAX_MEMORY_USAGE=80     # percentage
MAX_LOAD_AVERAGE=4.0

log_metric() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local metric_name="$1"
    local metric_value="$2"
    local status="$3"
    
    echo "{\"timestamp\":\"$timestamp\",\"metric\":\"$metric_name\",\"value\":$metric_value,\"status\":\"$status\"}" >> "$METRICS_FILE"
}

send_alert() {
    local alert_type="$1"
    local message="$2"
    local severity="$3"
    
    # Prevent spam - check if same alert was sent in last 30 minutes
    if [[ -f "$ALERT_FILE" ]]; then
        local last_alert=$(cat "$ALERT_FILE")
        local last_alert_time=$(echo "$last_alert" | cut -d'|' -f1)
        local current_time=$(date +%s)
        
        if [[ $((current_time - last_alert_time)) -lt 1800 && "$last_alert" == *"$alert_type"* ]]; then
            return 0  # Skip duplicate alert
        fi
    fi
    
    # Log alert
    echo "$(date +%s)|$alert_type|$message" > "$ALERT_FILE"
    echo "[$(date)] ALERT [$severity] $alert_type: $message" >> "$LOG_FILE"
    
    # Send email alert
    if [[ "$ENABLE_EMAIL_ALERTS" == "true" ]] && command -v mail &> /dev/null; then
        echo "$message" | mail -s "DocSwap Alert: $alert_type" "$EMAIL"
    fi
    
    # Send Slack alert
    if [[ "$ENABLE_SLACK_ALERTS" == "true" && -n "$SLACK_WEBHOOK" ]]; then
        local color="danger"
        [[ "$severity" == "WARNING" ]] && color="warning"
        [[ "$severity" == "INFO" ]] && color="good"
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"$color\",\"title\":\"DocSwap Alert: $alert_type\",\"text\":\"$message\",\"footer\":\"DocSwap Monitoring\",\"ts\":$(date +%s)}]}" \
            "$SLACK_WEBHOOK" &> /dev/null || true
    fi
}

check_endpoints() {
    local all_healthy=true
    
    for endpoint in "${ENDPOINTS[@]}"; do
        local start_time=$(date +%s%3N)
        local response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$endpoint" || echo "000")
        local end_time=$(date +%s%3N)
        local response_time=$((end_time - start_time))
        
        if [[ "$response_code" == "200" ]]; then
            log_metric "endpoint_${endpoint//[^a-zA-Z0-9]/_}_response_time" "$response_time" "healthy"
            log_metric "endpoint_${endpoint//[^a-zA-Z0-9]/_}_status" "1" "healthy"
            
            if [[ $response_time -gt $MAX_RESPONSE_TIME ]]; then
                send_alert "SLOW_RESPONSE" "Endpoint $endpoint responding slowly: ${response_time}ms" "WARNING"
            fi
        else
            log_metric "endpoint_${endpoint//[^a-zA-Z0-9]/_}_status" "0" "unhealthy"
            send_alert "ENDPOINT_DOWN" "Endpoint $endpoint is down (HTTP $response_code)" "CRITICAL"
            all_healthy=false
        fi
    done
    
    return $([[ "$all_healthy" == "true" ]] && echo 0 || echo 1)
}

check_system_resources() {
    # CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    cpu_usage=${cpu_usage%.*}  # Remove decimal part
    log_metric "cpu_usage" "$cpu_usage" $([[ $cpu_usage -lt $MAX_CPU_USAGE ]] && echo "healthy" || echo "unhealthy")
    
    if [[ $cpu_usage -gt $MAX_CPU_USAGE ]]; then
        send_alert "HIGH_CPU" "CPU usage is high: ${cpu_usage}%" "WARNING"
    fi
    
    # Memory usage
    local memory_info=$(free | grep Mem)
    local total_memory=$(echo $memory_info | awk '{print $2}')
    local used_memory=$(echo $memory_info | awk '{print $3}')
    local memory_usage=$((used_memory * 100 / total_memory))
    log_metric "memory_usage" "$memory_usage" $([[ $memory_usage -lt $MAX_MEMORY_USAGE ]] && echo "healthy" || echo "unhealthy")
    
    if [[ $memory_usage -gt $MAX_MEMORY_USAGE ]]; then
        send_alert "HIGH_MEMORY" "Memory usage is high: ${memory_usage}%" "WARNING"
    fi
    
    # Disk space
    local disk_usage=$(df / | tail -1 | awk '{print $4}')
    log_metric "disk_available" "$disk_usage" $([[ $disk_usage -gt $MIN_DISK_SPACE ]] && echo "healthy" || echo "unhealthy")
    
    if [[ $disk_usage -lt $MIN_DISK_SPACE ]]; then
        send_alert "LOW_DISK_SPACE" "Low disk space: ${disk_usage}KB available" "CRITICAL"
    fi
    
    # Load average
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    log_metric "load_average" "$load_avg" $(echo "$load_avg < $MAX_LOAD_AVERAGE" | bc -l | grep -q 1 && echo "healthy" || echo "unhealthy")
    
    if (( $(echo "$load_avg > $MAX_LOAD_AVERAGE" | bc -l) )); then
        send_alert "HIGH_LOAD" "System load is high: $load_avg" "WARNING"
    fi
}

check_application_processes() {
    # Check if DocSwap processes are running
    local gunicorn_count=$(pgrep -f "gunicorn.*docswap" | wc -l)
    local nginx_status=$(systemctl is-active nginx)
    local supervisor_status=$(systemctl is-active supervisor)
    
    log_metric "gunicorn_processes" "$gunicorn_count" $([[ $gunicorn_count -gt 0 ]] && echo "healthy" || echo "unhealthy")
    log_metric "nginx_status" $([[ "$nginx_status" == "active" ]] && echo "1" || echo "0") $([[ "$nginx_status" == "active" ]] && echo "healthy" || echo "unhealthy")
    log_metric "supervisor_status" $([[ "$supervisor_status" == "active" ]] && echo "1" || echo "0") $([[ "$supervisor_status" == "active" ]] && echo "healthy" || echo "unhealthy")
    
    if [[ $gunicorn_count -eq 0 ]]; then
        send_alert "PROCESS_DOWN" "No Gunicorn processes found" "CRITICAL"
    fi
    
    if [[ "$nginx_status" != "active" ]]; then
        send_alert "SERVICE_DOWN" "Nginx service is not active" "CRITICAL"
    fi
    
    if [[ "$supervisor_status" != "active" ]]; then
        send_alert "SERVICE_DOWN" "Supervisor service is not active" "CRITICAL"
    fi
}

check_log_errors() {
    # Check for recent errors in application logs
    local error_count=$(tail -n 100 /var/log/docswap/app.log 2>/dev/null | grep -i error | wc -l)
    log_metric "recent_errors" "$error_count" $([[ $error_count -lt 5 ]] && echo "healthy" || echo "unhealthy")
    
    if [[ $error_count -gt 10 ]]; then
        send_alert "HIGH_ERROR_RATE" "High error rate detected: $error_count errors in last 100 log lines" "WARNING"
    fi
}

generate_health_report() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local report_file="/opt/docswap-monitoring/reports/health_report_$(date +%Y%m%d_%H%M%S).json"
    
    mkdir -p "$(dirname "$report_file")"
    
    cat > "$report_file" << EOF
{
    "timestamp": "$timestamp",
    "domain": "$DOMAIN",
    "checks": {
        "endpoints": $(check_endpoints &>/dev/null && echo "true" || echo "false"),
        "system_resources": "completed",
        "application_processes": "completed",
        "log_errors": "completed"
    },
    "metrics_file": "$METRICS_FILE",
    "log_file": "$LOG_FILE"
}
EOF
    
    echo "$report_file"
}

# Main health check execution
main() {
    echo "[$(date)] Starting health check..." >> "$LOG_FILE"
    
    check_endpoints
    check_system_resources
    check_application_processes
    check_log_errors
    
    local report_file=$(generate_health_report)
    echo "[$(date)] Health check completed. Report: $report_file" >> "$LOG_FILE"
}

main "$@"
EOF
    
    chmod +x "$MONITORING_DIR/scripts/health_check.sh"
    log "Health check script created"
}

create_performance_monitor() {
    log "Creating performance monitoring script..."
    
    cat > "$MONITORING_DIR/scripts/performance_monitor.sh" << 'EOF'
#!/bin/bash

# DocSwap Performance Monitor
# Tracks application performance metrics

DOMAIN="${DOMAIN:-localhost}"
METRICS_FILE="/opt/docswap-monitoring/metrics/performance_metrics.json"
LOG_FILE="/var/log/docswap/performance.log"

log_performance_metric() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local metric_name="$1"
    local metric_value="$2"
    local unit="$3"
    
    echo "{\"timestamp\":\"$timestamp\",\"metric\":\"$metric_name\",\"value\":$metric_value,\"unit\":\"$unit\"}" >> "$METRICS_FILE"
}

test_api_performance() {
    local endpoint="https://$DOMAIN/api/config"
    local start_time=$(date +%s%3N)
    
    local response=$(curl -s -w "%{http_code}|%{time_total}|%{time_connect}|%{time_starttransfer}" "$endpoint")
    local end_time=$(date +%s%3N)
    
    local http_code=$(echo "$response" | tail -1 | cut -d'|' -f1)
    local time_total=$(echo "$response" | tail -1 | cut -d'|' -f2)
    local time_connect=$(echo "$response" | tail -1 | cut -d'|' -f3)
    local time_starttransfer=$(echo "$response" | tail -1 | cut -d'|' -f4)
    
    if [[ "$http_code" == "200" ]]; then
        log_performance_metric "api_response_time" "$time_total" "seconds"
        log_performance_metric "api_connect_time" "$time_connect" "seconds"
        log_performance_metric "api_transfer_time" "$time_starttransfer" "seconds"
    fi
}

monitor_database_performance() {
    # If using a database, add database performance metrics here
    # For now, we'll monitor file system performance as a proxy
    
    local start_time=$(date +%s%3N)
    dd if=/dev/zero of=/tmp/test_write bs=1M count=10 &>/dev/null
    local end_time=$(date +%s%3N)
    rm -f /tmp/test_write
    
    local write_time=$((end_time - start_time))
    log_performance_metric "disk_write_speed" "$write_time" "milliseconds_per_10MB"
}

monitor_network_performance() {
    # Test network latency to external services
    local ping_time=$(ping -c 1 8.8.8.8 | grep 'time=' | awk -F'time=' '{print $2}' | awk '{print $1}' || echo "0")
    log_performance_metric "external_ping_latency" "$ping_time" "milliseconds"
}

# Main execution
main() {
    echo "[$(date)] Starting performance monitoring..." >> "$LOG_FILE"
    
    test_api_performance
    monitor_database_performance
    monitor_network_performance
    
    echo "[$(date)] Performance monitoring completed" >> "$LOG_FILE"
}

main "$@"
EOF
    
    chmod +x "$MONITORING_DIR/scripts/performance_monitor.sh"
    log "Performance monitor created"
}

create_log_analyzer() {
    log "Creating log analysis script..."
    
    cat > "$MONITORING_DIR/scripts/log_analyzer.sh" << 'EOF'
#!/bin/bash

# DocSwap Log Analyzer
# Analyzes application logs for patterns and issues

LOG_DIR="/var/log/docswap"
ANALYSIS_DIR="/opt/docswap-monitoring/analysis"
REPORT_FILE="$ANALYSIS_DIR/log_analysis_$(date +%Y%m%d_%H%M%S).txt"

mkdir -p "$ANALYSIS_DIR"

analyze_error_patterns() {
    echo "=== ERROR PATTERN ANALYSIS ===" >> "$REPORT_FILE"
    echo "Generated: $(date)" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # Most common errors
    echo "Top 10 Error Messages:" >> "$REPORT_FILE"
    grep -i error "$LOG_DIR"/*.log 2>/dev/null | \
        awk -F': ' '{print $NF}' | \
        sort | uniq -c | sort -nr | head -10 >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # Error frequency by hour
    echo "Error Frequency by Hour (last 24h):" >> "$REPORT_FILE"
    grep -i error "$LOG_DIR"/*.log 2>/dev/null | \
        grep "$(date +%Y-%m-%d)" | \
        awk '{print $2}' | cut -d: -f1 | \
        sort | uniq -c >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
}

analyze_performance_patterns() {
    echo "=== PERFORMANCE PATTERN ANALYSIS ===" >> "$REPORT_FILE"
    
    # Slow requests
    echo "Slow Requests (>2s response time):" >> "$REPORT_FILE"
    grep "response_time" "$LOG_DIR"/*.log 2>/dev/null | \
        awk '$NF > 2000 {print}' | head -20 >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # Request volume by endpoint
    echo "Request Volume by Endpoint:" >> "$REPORT_FILE"
    grep "GET\|POST\|PUT\|DELETE" "$LOG_DIR"/*.log 2>/dev/null | \
        awk '{for(i=1;i<=NF;i++) if($i ~ /^\//) print $i}' | \
        sort | uniq -c | sort -nr | head -10 >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
}

analyze_security_events() {
    echo "=== SECURITY EVENT ANALYSIS ===" >> "$REPORT_FILE"
    
    # Failed login attempts
    echo "Failed Authentication Attempts:" >> "$REPORT_FILE"
    grep -i "authentication\|login.*fail\|unauthorized" "$LOG_DIR"/*.log 2>/dev/null | \
        wc -l >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # Suspicious IP addresses
    echo "Top IP Addresses with Errors:" >> "$REPORT_FILE"
    grep -i error "$LOG_DIR"/*.log 2>/dev/null | \
        grep -oE '\b([0-9]{1,3}\.){3}[0-9]{1,3}\b' | \
        sort | uniq -c | sort -nr | head -10 >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
}

generate_summary() {
    echo "=== SUMMARY ===" >> "$REPORT_FILE"
    echo "Analysis completed: $(date)" >> "$REPORT_FILE"
    echo "Log files analyzed: $(ls "$LOG_DIR"/*.log 2>/dev/null | wc -l)" >> "$REPORT_FILE"
    echo "Total log size: $(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)" >> "$REPORT_FILE"
    echo "Report location: $REPORT_FILE" >> "$REPORT_FILE"
}

# Main execution
main() {
    analyze_error_patterns
    analyze_performance_patterns
    analyze_security_events
    generate_summary
    
    echo "Log analysis completed. Report: $REPORT_FILE"
}

main "$@"
EOF
    
    chmod +x "$MONITORING_DIR/scripts/log_analyzer.sh"
    log "Log analyzer created"
}

setup_cron_jobs() {
    log "Setting up monitoring cron jobs..."
    
    # Create cron jobs for monitoring
    cat > /etc/cron.d/docswap-monitoring << EOF
# DocSwap Monitoring Cron Jobs

# Health check every minute
* * * * * root $MONITORING_DIR/scripts/health_check.sh

# Performance monitoring every 5 minutes
*/5 * * * * root $MONITORING_DIR/scripts/performance_monitor.sh

# Log analysis every hour
0 * * * * root $MONITORING_DIR/scripts/log_analyzer.sh

# Cleanup old metrics (keep 7 days)
0 2 * * * root find $METRICS_DIR -name "*.json" -mtime +7 -delete

# Cleanup old reports (keep 30 days)
0 3 * * * root find $MONITORING_DIR/reports -name "*.json" -mtime +30 -delete
EOF
    
    log "Cron jobs configured"
}

setup_log_rotation() {
    log "Setting up log rotation..."
    
    cat > /etc/logrotate.d/docswap << EOF
/var/log/docswap/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        systemctl reload supervisor
    endscript
}

$MONITORING_DIR/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF
    
    log "Log rotation configured"
}

create_dashboard_script() {
    log "Creating monitoring dashboard script..."
    
    cat > "$MONITORING_DIR/scripts/dashboard.sh" << 'EOF'
#!/bin/bash

# DocSwap Monitoring Dashboard
# Displays real-time monitoring information

METRICS_FILE="/opt/docswap-monitoring/metrics/health_metrics.json"
PERFORMANCE_FILE="/opt/docswap-monitoring/metrics/performance_metrics.json"

clear
echo "🚀 DocSwap Monitoring Dashboard"
echo "================================"
echo "Last updated: $(date)"
echo ""

# System Status
echo "📊 System Status:"
echo "  CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "  Memory Usage: $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
echo "  Disk Usage: $(df / | tail -1 | awk '{printf "%.1f%%", $5}' | sed 's/%//')"
echo "  Load Average: $(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')"
echo ""

# Service Status
echo "🔧 Service Status:"
echo "  Nginx: $(systemctl is-active nginx)"
echo "  Supervisor: $(systemctl is-active supervisor)"
echo "  Gunicorn Processes: $(pgrep -f "gunicorn.*docswap" | wc -l)"
echo ""

# Recent Metrics
echo "📈 Recent Health Metrics:"
if [[ -f "$METRICS_FILE" ]]; then
    tail -5 "$METRICS_FILE" | jq -r '"\(.timestamp) - \(.metric): \(.value) (\(.status))"' 2>/dev/null || echo "  No recent metrics available"
else
    echo "  No metrics file found"
fi
echo ""

# Performance Metrics
echo "⚡ Recent Performance Metrics:"
if [[ -f "$PERFORMANCE_FILE" ]]; then
    tail -5 "$PERFORMANCE_FILE" | jq -r '"\(.timestamp) - \(.metric): \(.value) \(.unit)"' 2>/dev/null || echo "  No recent performance metrics available"
else
    echo "  No performance metrics file found"
fi
echo ""

# Quick Actions
echo "🛠️  Quick Actions:"
echo "  View logs: tail -f /var/log/docswap/app.log"
echo "  Check health: $MONITORING_DIR/scripts/health_check.sh"
echo "  Performance test: $MONITORING_DIR/scripts/performance_monitor.sh"
echo "  Analyze logs: $MONITORING_DIR/scripts/log_analyzer.sh"
EOF
    
    chmod +x "$MONITORING_DIR/scripts/dashboard.sh"
    log "Dashboard script created"
}

show_setup_summary() {
    log "🎉 Monitoring setup completed successfully!"
    echo
    echo "📋 Monitoring Components Installed:"
    echo "  ✅ Health Check System"
    echo "  ✅ Performance Monitoring"
    echo "  ✅ Log Analysis"
    echo "  ✅ Alert System (Email/Slack)"
    echo "  ✅ Automated Cron Jobs"
    echo "  ✅ Log Rotation"
    echo "  ✅ Monitoring Dashboard"
    echo
    echo "📁 Important Locations:"
    echo "  Scripts: $MONITORING_DIR/scripts/"
    echo "  Metrics: $MONITORING_DIR/metrics/"
    echo "  Logs: /var/log/docswap/"
    echo "  Reports: $MONITORING_DIR/reports/"
    echo
    echo "🔧 Available Commands:"
    echo "  Health Check: $MONITORING_DIR/scripts/health_check.sh"
    echo "  Performance Monitor: $MONITORING_DIR/scripts/performance_monitor.sh"
    echo "  Log Analyzer: $MONITORING_DIR/scripts/log_analyzer.sh"
    echo "  Dashboard: $MONITORING_DIR/scripts/dashboard.sh"
    echo
    echo "📊 Monitoring Dashboard:"
    echo "  Run: $MONITORING_DIR/scripts/dashboard.sh"
    echo
    echo "⚙️  Configuration:"
    echo "  Edit cron jobs: /etc/cron.d/docswap-monitoring"
    echo "  Log rotation: /etc/logrotate.d/docswap"
    echo "  Alert settings: Edit scripts in $MONITORING_DIR/scripts/"
}

# Main execution
main() {
    log "Starting DocSwap monitoring setup..."
    
    check_root
    install_dependencies
    create_monitoring_structure
    create_health_check_script
    create_performance_monitor
    create_log_analyzer
    setup_cron_jobs
    setup_log_rotation
    create_dashboard_script
    show_setup_summary
}

# Command line interface
case "${1:-setup}" in
    "setup")
        main
        ;;
    "dashboard")
        "$MONITORING_DIR/scripts/dashboard.sh"
        ;;
    "health")
        "$MONITORING_DIR/scripts/health_check.sh"
        ;;
    "performance")
        "$MONITORING_DIR/scripts/performance_monitor.sh"
        ;;
    "analyze")
        "$MONITORING_DIR/scripts/log_analyzer.sh"
        ;;
    *)
        echo "Usage: $0 {setup|dashboard|health|performance|analyze}"
        echo "  setup       - Install monitoring system"
        echo "  dashboard   - Show monitoring dashboard"
        echo "  health      - Run health check"
        echo "  performance - Run performance test"
        echo "  analyze     - Analyze logs"
        exit 1
        ;;
esac