#!/bin/bash

# DocSwap Production Startup Script
# This script handles the complete production deployment and startup process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
APP_DIR="/var/www/docswap"
APP_USER="docswap"
VENV_DIR="$APP_DIR/venv"
LOG_DIR="/var/log/docswap"
PID_FILE="/var/run/docswap.pid"

# Function to check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Function to create directories
setup_directories() {
    log_info "Setting up directories..."
    
    mkdir -p "$APP_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$APP_DIR/uploads"
    mkdir -p "$APP_DIR/output"
    mkdir -p "$APP_DIR/logs"
    
    # Set proper ownership
    chown -R $APP_USER:$APP_USER "$APP_DIR"
    chown -R $APP_USER:$APP_USER "$LOG_DIR"
    
    log_success "Directories created and configured"
}

# Function to setup Python environment
setup_python_env() {
    log_info "Setting up Python virtual environment..."
    
    cd "$APP_DIR"
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "$VENV_DIR" ]; then
        sudo -u $APP_USER python3.11 -m venv "$VENV_DIR"
        log_success "Virtual environment created"
    fi
    
    # Activate virtual environment and install dependencies
    sudo -u $APP_USER bash -c "
        source '$VENV_DIR/bin/activate'
        pip install --upgrade pip setuptools wheel
        pip install -r requirements.txt
    "
    
    log_success "Python dependencies installed"
}

# Function to setup environment configuration
setup_environment() {
    log_info "Setting up environment configuration..."
    
    if [ ! -f "$APP_DIR/.env" ]; then
        if [ -f "$APP_DIR/.env.production.optimized" ]; then
            cp "$APP_DIR/.env.production.optimized" "$APP_DIR/.env"
            log_warning "Created .env from .env.production.optimized template"
            log_warning "Please edit $APP_DIR/.env with your actual configuration!"
        else
            log_error ".env file not found and no template available"
            exit 1
        fi
    fi
    
    # Secure the environment file
    chmod 600 "$APP_DIR/.env"
    chown $APP_USER:$APP_USER "$APP_DIR/.env"
    
    log_success "Environment configuration ready"
}

# Function to check system dependencies
check_system_deps() {
    log_info "Checking system dependencies..."
    
    # Check for required system packages
    REQUIRED_PACKAGES=(
        "python3.11"
        "python3.11-pip"
        "python3.11-venv"
        "poppler-utils"
        "tesseract-ocr"
        "libreoffice"
        "nginx"
        "supervisor"
    )
    
    MISSING_PACKAGES=()
    
    for package in "${REQUIRED_PACKAGES[@]}"; do
        if ! dpkg -l | grep -q "^ii  $package "; then
            MISSING_PACKAGES+=("$package")
        fi
    done
    
    if [ ${#MISSING_PACKAGES[@]} -ne 0 ]; then
        log_error "Missing required packages: ${MISSING_PACKAGES[*]}"
        log_info "Installing missing packages..."
        apt update
        apt install -y "${MISSING_PACKAGES[@]}"
    fi
    
    log_success "System dependencies verified"
}

# Function to start the application
start_application() {
    log_info "Starting DocSwap application..."
    
    cd "$APP_DIR"
    
    # Kill existing process if running
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if ps -p "$OLD_PID" > /dev/null 2>&1; then
            log_info "Stopping existing process (PID: $OLD_PID)"
            kill "$OLD_PID"
            sleep 2
        fi
        rm -f "$PID_FILE"
    fi
    
    # Start with Gunicorn
    sudo -u $APP_USER bash -c "
        source '$VENV_DIR/bin/activate'
        cd '$APP_DIR'
        gunicorn --config gunicorn.conf.py --daemon --pid '$PID_FILE' app:app
    "
    
    # Wait a moment and check if it started successfully
    sleep 3
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            log_success "DocSwap started successfully (PID: $PID)"
        else
            log_error "Failed to start DocSwap"
            exit 1
        fi
    else
        log_error "PID file not created - startup may have failed"
        exit 1
    fi
}

# Function to show status
show_status() {
    log_info "DocSwap Application Status:"
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo -e "  Status: ${GREEN}RUNNING${NC} (PID: $PID)"
            echo -e "  Memory: $(ps -p $PID -o rss= | awk '{print $1/1024 " MB"}')"
            echo -e "  CPU: $(ps -p $PID -o %cpu= | awk '{print $1"%"}')"
        else
            echo -e "  Status: ${RED}STOPPED${NC} (stale PID file)"
        fi
    else
        echo -e "  Status: ${RED}STOPPED${NC}"
    fi
    
    echo -e "  Log files:"
    echo -e "    Application: $LOG_DIR/gunicorn_error.log"
    echo -e "    Access: $LOG_DIR/gunicorn_access.log"
    echo -e "    Admin: $APP_DIR/logs/admin.log"
}

# Function to stop the application
stop_application() {
    log_info "Stopping DocSwap application..."
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            kill "$PID"
            sleep 2
            
            # Force kill if still running
            if ps -p "$PID" > /dev/null 2>&1; then
                kill -9 "$PID"
            fi
            
            rm -f "$PID_FILE"
            log_success "DocSwap stopped"
        else
            log_warning "Process not running (removing stale PID file)"
            rm -f "$PID_FILE"
        fi
    else
        log_warning "DocSwap is not running"
    fi
}

# Main script logic
case "${1:-start}" in
    "start")
        check_root
        check_system_deps
        setup_directories
        setup_python_env
        setup_environment
        start_application
        show_status
        ;;
    "stop")
        check_root
        stop_application
        ;;
    "restart")
        check_root
        stop_application
        sleep 2
        start_application
        show_status
        ;;
    "status")
        show_status
        ;;
    "setup")
        check_root
        check_system_deps
        setup_directories
        setup_python_env
        setup_environment
        log_success "Setup completed. Run '$0 start' to start the application."
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|setup}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the DocSwap application"
        echo "  stop    - Stop the DocSwap application"
        echo "  restart - Restart the DocSwap application"
        echo "  status  - Show application status"
        echo "  setup   - Setup environment without starting"
        exit 1
        ;;
esac