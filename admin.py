#!/usr/bin/env python3
"""
DocSwap Admin Portal
Provides monitoring, analytics, and administrative functions for the DocSwap application.
"""

import os
import json
import time
import psutil
from datetime import datetime, timedelta
from flask import Blueprint, render_template, jsonify, request, redirect, url_for, session
from functools import wraps
import sqlite3
import logging
from collections import defaultdict, Counter

# Admin configuration
ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'change_me_in_production')
ADMIN_SECRET_KEY = os.getenv('ADMIN_SECRET_KEY', 'admin_secret_key_change_me')
LOG_FILE_PATH = os.getenv('LOG_FILE_PATH', '/var/log/docswap/app.log')
UPLOADS_DIR = os.getenv('UPLOADS_DIR', './uploads')
OUTPUT_DIR = os.getenv('OUTPUT_DIR', './output')

# Initialize Blueprint for admin
admin_app = Blueprint('admin', __name__, template_folder='admin_templates')

# Configure logging
import os
log_dir = os.path.join(os.path.dirname(__file__), 'logs')
os.makedirs(log_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(log_dir, 'admin.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Database for storing metrics
METRICS_DB = 'admin_metrics.db'

def init_metrics_db():
    """Initialize the metrics database"""
    conn = sqlite3.connect(METRICS_DB)
    cursor = conn.cursor()
    
    # Create tables for storing metrics
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS app_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            metric_type TEXT NOT NULL,
            metric_name TEXT NOT NULL,
            metric_value REAL,
            metadata TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_activity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_id TEXT,
            action TEXT NOT NULL,
            file_type TEXT,
            file_size INTEGER,
            conversion_type TEXT,
            ip_address TEXT,
            user_agent TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS system_health (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            cpu_percent REAL,
            memory_percent REAL,
            disk_usage REAL,
            active_sessions INTEGER,
            total_files INTEGER
        )
    ''')
    
    conn.commit()
    conn.close()

def require_admin_auth(f):
    """Decorator to require admin authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_logged_in' not in session:
            return redirect(url_for('admin.admin_login'))
        return f(*args, **kwargs)
    return decorated_function

def collect_system_metrics():
    """Collect current system metrics"""
    try:
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Application metrics
        uploads_count = len([f for f in os.listdir(UPLOADS_DIR) if os.path.isfile(os.path.join(UPLOADS_DIR, f))]) if os.path.exists(UPLOADS_DIR) else 0
        output_count = len([f for f in os.listdir(OUTPUT_DIR) if os.path.isfile(os.path.join(OUTPUT_DIR, f))]) if os.path.exists(OUTPUT_DIR) else 0
        
        # Store in database
        conn = sqlite3.connect(METRICS_DB)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO system_health 
            (cpu_percent, memory_percent, disk_usage, active_sessions, total_files)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            cpu_percent,
            memory.percent,
            disk.percent,
            0,  # Will be updated with actual session count
            uploads_count + output_count
        ))
        
        conn.commit()
        conn.close()
        
        return {
            'cpu_percent': cpu_percent,
            'memory_percent': memory.percent,
            'memory_used_gb': memory.used / (1024**3),
            'memory_total_gb': memory.total / (1024**3),
            'disk_usage_percent': disk.percent,
            'disk_free_gb': disk.free / (1024**3),
            'total_files': uploads_count + output_count,
            'uploads_count': uploads_count,
            'output_count': output_count
        }
    except Exception as e:
        logger.error(f"Error collecting system metrics: {e}")
        return {}

def parse_log_file(hours=24):
    """Parse application log file for insights"""
    try:
        if not os.path.exists(LOG_FILE_PATH):
            return {'error': 'Log file not found'}
        
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        stats = {
            'total_requests': 0,
            'uploads': 0,
            'conversions': 0,
            'errors': 0,
            'warnings': 0,
            'file_types': Counter(),
            'conversion_types': Counter(),
            'error_types': Counter(),
            'hourly_activity': defaultdict(int)
        }
        
        with open(LOG_FILE_PATH, 'r') as f:
            for line in f:
                try:
                    # Parse timestamp
                    if ' - ' in line:
                        timestamp_str = line.split(' - ')[0]
                        timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S,%f')
                        
                        if timestamp < cutoff_time:
                            continue
                        
                        hour_key = timestamp.strftime('%Y-%m-%d %H:00')
                        stats['hourly_activity'][hour_key] += 1
                        
                        # Count different types of events
                        if 'upload' in line.lower():
                            stats['uploads'] += 1
                        elif 'conversion' in line.lower():
                            stats['conversions'] += 1
                        elif 'ERROR' in line:
                            stats['errors'] += 1
                            # Extract error type
                            if ':' in line:
                                error_msg = line.split(':')[-1].strip()
                                stats['error_types'][error_msg[:50]] += 1
                        elif 'WARNING' in line:
                            stats['warnings'] += 1
                        
                        stats['total_requests'] += 1
                        
                except Exception as e:
                    continue
        
        return stats
    except Exception as e:
        logger.error(f"Error parsing log file: {e}")
        return {'error': str(e)}

@admin_app.route('/login', methods=['GET', 'POST'])
def admin_login():
    """Admin login page"""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session['admin_logged_in'] = True
            logger.info(f"Admin login successful from {request.remote_addr}")
            return redirect(url_for('admin.admin_dashboard'))
        else:
            logger.warning(f"Failed admin login attempt from {request.remote_addr}")
            return render_template('admin_login.html', error='Invalid credentials')
    
    return render_template('admin_login.html')

@admin_app.route('/logout')
def admin_logout():
    """Admin logout"""
    session.pop('admin_logged_in', None)
    return redirect(url_for('admin.admin_login'))

@admin_app.route('/')
@admin_app.route('/dashboard')
@require_admin_auth
def admin_dashboard():
    """Main admin dashboard"""
    # Collect current metrics
    system_metrics = collect_system_metrics()
    log_stats = parse_log_file(24)  # Last 24 hours
    
    # Basic health status
    health_data = {
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'database': True,  # Simplified for now
        'file_system': os.path.exists(UPLOADS_DIR)
    }
    
    # System information
    import sys
    import flask
    system_info = {
        'python_version': f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        'flask_version': flask.__version__,
        'uptime': 'N/A',  # Simplified for now
        'upload_dir': UPLOADS_DIR,
        'max_file_size': '50MB'  # Default value
    }
    
    return render_template('admin_dashboard.html', 
                         metrics=system_metrics,
                         log_stats=log_stats,
                         health=health_data,
                         system_info=system_info)

@admin_app.route('/api/metrics')
@require_admin_auth
def api_metrics():
    """API endpoint for real-time metrics"""
    return jsonify(collect_system_metrics())

@admin_app.route('/api/logs')
@require_admin_auth
def api_logs():
    """API endpoint for log analysis"""
    hours = request.args.get('hours', 24, type=int)
    return jsonify(parse_log_file(hours))

@admin_app.route('/api/health')
def api_health():
    """Health check endpoint"""
    try:
        # Basic health checks
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'checks': {
                'database': 'ok',
                'disk_space': 'ok',
                'memory': 'ok',
                'uploads_dir': 'ok'
            }
        }
        
        # Check disk space
        disk = psutil.disk_usage('/')
        if disk.percent > 90:
            health_status['checks']['disk_space'] = 'warning'
            health_status['status'] = 'warning'
        
        # Check memory
        memory = psutil.virtual_memory()
        if memory.percent > 90:
            health_status['checks']['memory'] = 'warning'
            health_status['status'] = 'warning'
        
        # Check uploads directory
        if not os.path.exists(UPLOADS_DIR):
            health_status['checks']['uploads_dir'] = 'error'
            health_status['status'] = 'unhealthy'
        
        return jsonify(health_status)
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@admin_app.route('/files')
@require_admin_auth
def admin_files():
    """File management interface"""
    try:
        # Get filter parameters
        search = request.args.get('search', '').strip()
        file_type = request.args.get('file_type', '')
        status = request.args.get('status', '')
        sort_by = request.args.get('sort_by', 'modified')
        page = request.args.get('page', 1, type=int)
        per_page = 20
        
        all_files = []
        
        # List upload files
        if os.path.exists(UPLOADS_DIR):
            for filename in os.listdir(UPLOADS_DIR):
                filepath = os.path.join(UPLOADS_DIR, filename)
                if os.path.isfile(filepath):
                    stat = os.stat(filepath)
                    file_ext = filename.split('.')[-1].lower() if '.' in filename else ''
                    
                    # Check if there's a corresponding output file
                    output_file = None
                    if os.path.exists(OUTPUT_DIR):
                        for output_filename in os.listdir(OUTPUT_DIR):
                            if filename.split('_', 1)[-1].split('.')[0] in output_filename:
                                output_file = output_filename
                                break
                    
                    file_info = {
                        'id': filename.replace('.', '_'),
                        'filename': filename,
                        'original_filename': filename.split('_', 1)[-1] if '_' in filename else filename,
                        'file_type': file_ext,
                        'file_size': stat.st_size,
                        'upload_time': datetime.fromtimestamp(stat.st_mtime),
                        'modified': datetime.fromtimestamp(stat.st_mtime),
                        'session_id': filename.split('_')[0] if '_' in filename else 'unknown',
                        'upload_ip': 'N/A',
                        'converted_filename': output_file,
                        'type': 'upload',
                        'status': 'converted' if output_file else 'active'
                    }
                    all_files.append(file_info)
        
        # List output files that don't have corresponding uploads
        if os.path.exists(OUTPUT_DIR):
            for filename in os.listdir(OUTPUT_DIR):
                filepath = os.path.join(OUTPUT_DIR, filename)
                if os.path.isfile(filepath):
                    # Check if this output file already has a corresponding upload
                    has_upload = False
                    for upload_file in all_files:
                        if upload_file['converted_filename'] == filename:
                            has_upload = True
                            break
                    
                    if not has_upload:
                        stat = os.stat(filepath)
                        file_ext = filename.split('.')[-1].lower() if '.' in filename else ''
                        
                        file_info = {
                            'id': filename.replace('.', '_'),
                            'filename': filename,
                            'original_filename': filename.split('-', 1)[-1] if '-' in filename else filename,
                            'file_type': file_ext,
                            'file_size': stat.st_size,
                            'upload_time': datetime.fromtimestamp(stat.st_mtime),
                            'modified': datetime.fromtimestamp(stat.st_mtime),
                            'session_id': filename.split('-')[0] if '-' in filename else 'unknown',
                            'upload_ip': 'N/A',
                            'converted_filename': None,
                            'type': 'output',
                            'status': 'converted'
                        }
                        all_files.append(file_info)
        
        # Apply filters
        filtered_files = all_files
        
        if search:
            filtered_files = [f for f in filtered_files if search.lower() in f['filename'].lower() or search.lower() in f['original_filename'].lower()]
        
        if file_type:
            filtered_files = [f for f in filtered_files if f['file_type'] == file_type]
        
        if status:
            filtered_files = [f for f in filtered_files if f['status'] == status]
        
        # Sort files
        if sort_by == 'filename':
            filtered_files.sort(key=lambda x: x['filename'])
        elif sort_by == 'file_size':
            filtered_files.sort(key=lambda x: x['file_size'], reverse=True)
        elif sort_by == 'session_id':
            filtered_files.sort(key=lambda x: x['session_id'])
        else:  # default to upload_time/modified
            filtered_files.sort(key=lambda x: x['upload_time'], reverse=True)
        
        # Pagination
        total_files = len(filtered_files)
        total_pages = (total_files + per_page - 1) // per_page
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        files = filtered_files[start_idx:end_idx]
        
        return render_template('admin_files.html', 
                             files=files,
                             total_files=total_files,
                             total_pages=total_pages,
                             page=page,
                             per_page=per_page)
    except Exception as e:
        logger.error(f"Error listing files: {e}")
        return render_template('admin_files.html', files=[], total_files=0, total_pages=0, page=1, error=str(e))

@admin_app.route('/delete_file', methods=['POST'])
@require_admin_auth
def admin_delete_file():
    """Delete a specific file"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        file_type = data.get('type', 'upload')
        
        logger.info(f"Admin single file delete request: {filename} (type: {file_type})")
        
        if not filename:
            return jsonify({'success': False, 'error': 'Filename is required'}), 400
        
        # Determine file path based on type
        if file_type == 'upload':
            filepath = os.path.join(UPLOADS_DIR, filename)
        elif file_type == 'output':
            filepath = os.path.join(OUTPUT_DIR, filename)
        else:
            return jsonify({'success': False, 'error': 'Invalid file type'}), 400
        
        logger.info(f"Attempting to delete file: {filepath} (exists: {os.path.exists(filepath)})")
        
        # Check if file exists and delete it
        if os.path.exists(filepath):
            os.remove(filepath)
            logger.info(f"Admin deleted file: {filepath}")
            
            # Also try to delete corresponding file in the other directory
            if file_type == 'upload':
                # Try to find and delete corresponding output file
                session_id = filename.split('_')[0] if '_' in filename else ''
                original_name = filename.split('_', 1)[-1].split('.')[0] if '_' in filename else filename.split('.')[0]
                
                if os.path.exists(OUTPUT_DIR):
                    for output_file in os.listdir(OUTPUT_DIR):
                        if session_id in output_file and original_name in output_file:
                            output_path = os.path.join(OUTPUT_DIR, output_file)
                            try:
                                os.remove(output_path)
                                logger.info(f"Also deleted corresponding output file: {output_path}")
                            except Exception as e:
                                logger.warning(f"Could not delete corresponding output file {output_path}: {e}")
                            break
            
            return jsonify({'success': True, 'message': f'File {filename} deleted successfully'})
        else:
            logger.warning(f"File not found: {filepath}")
            return jsonify({'success': False, 'error': 'File not found'}), 404
            
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_app.route('/delete_files', methods=['POST'])
@require_admin_auth
def admin_delete_files():
    """Delete multiple files"""
    try:
        data = request.get_json()
        file_ids = data.get('file_ids', [])
        
        if not file_ids:
            return jsonify({'success': False, 'error': 'No files specified'}), 400
        
        deleted_files = []
        errors = []
        
        logger.info(f"Admin bulk delete request: {len(file_ids)} files - {file_ids}")
        
        for filename in file_ids:
            try:
                # Use filename directly (no transformation needed)
                # Try both upload and output directories
                upload_path = os.path.join(UPLOADS_DIR, filename)
                output_path = os.path.join(OUTPUT_DIR, filename)
                
                logger.info(f"Attempting to delete: {filename}")
                logger.info(f"Upload path: {upload_path} (exists: {os.path.exists(upload_path)})")
                logger.info(f"Output path: {output_path} (exists: {os.path.exists(output_path)})")
                
                deleted = False
                if os.path.exists(upload_path):
                    os.remove(upload_path)
                    deleted_files.append(f"uploads/{filename}")
                    deleted = True
                    logger.info(f"Successfully deleted upload file: {upload_path}")
                
                if os.path.exists(output_path):
                    os.remove(output_path)
                    deleted_files.append(f"output/{filename}")
                    deleted = True
                    logger.info(f"Successfully deleted output file: {output_path}")
                
                if not deleted:
                    errors.append(f"File not found: {filename}")
                    logger.warning(f"File not found in either directory: {filename}")
                    
            except Exception as e:
                error_msg = f"Error deleting {filename}: {str(e)}"
                errors.append(error_msg)
                logger.error(error_msg)
        
        logger.info(f"Admin bulk delete completed: removed {len(deleted_files)} files, {len(errors)} errors")
        
        # Return success even if some files had errors, but include error details
        return jsonify({
            'success': len(deleted_files) > 0 or len(errors) == 0,
            'deleted_files': len(deleted_files),
            'files': deleted_files,
            'errors': errors
        })
        
    except Exception as e:
        logger.error(f"Error in bulk delete: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_app.route('/cleanup', methods=['POST'])
@require_admin_auth
def admin_cleanup():
    """Clean up old files"""
    try:
        hours = request.form.get('hours', 24, type=int)
        cutoff_time = time.time() - (hours * 3600)
        
        cleaned_files = []
        
        # Clean uploads
        if os.path.exists(UPLOADS_DIR):
            for filename in os.listdir(UPLOADS_DIR):
                filepath = os.path.join(UPLOADS_DIR, filename)
                if os.path.isfile(filepath) and os.path.getmtime(filepath) < cutoff_time:
                    os.remove(filepath)
                    cleaned_files.append(f"uploads/{filename}")
        
        # Clean outputs
        if os.path.exists(OUTPUT_DIR):
            for filename in os.listdir(OUTPUT_DIR):
                filepath = os.path.join(OUTPUT_DIR, filename)
                if os.path.isfile(filepath) and os.path.getmtime(filepath) < cutoff_time:
                    os.remove(filepath)
                    cleaned_files.append(f"output/{filename}")
        
        logger.info(f"Admin cleanup: removed {len(cleaned_files)} files older than {hours} hours")
        
        return jsonify({
            'success': True,
            'cleaned_files': len(cleaned_files),
            'files': cleaned_files
        })
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_app.route('/auto_cleanup', methods=['POST'])
@require_admin_auth
def admin_auto_cleanup():
    """Perform automatic cleanup of files older than 24 hours"""
    try:
        # Automatically clean files older than 24 hours
        cutoff_time = time.time() - (24 * 3600)  # 24 hours
        
        cleaned_files = []
        
        # Clean uploads
        if os.path.exists(UPLOADS_DIR):
            for filename in os.listdir(UPLOADS_DIR):
                filepath = os.path.join(UPLOADS_DIR, filename)
                if os.path.isfile(filepath) and os.path.getmtime(filepath) < cutoff_time:
                    os.remove(filepath)
                    cleaned_files.append(f"uploads/{filename}")
        
        # Clean outputs
        if os.path.exists(OUTPUT_DIR):
            for filename in os.listdir(OUTPUT_DIR):
                filepath = os.path.join(OUTPUT_DIR, filename)
                if os.path.isfile(filepath) and os.path.getmtime(filepath) < cutoff_time:
                    os.remove(filepath)
                    cleaned_files.append(f"output/{filename}")
        
        logger.info(f"Auto cleanup: removed {len(cleaned_files)} files older than 24 hours")
        
        return jsonify({
            'success': True,
            'cleaned_files': len(cleaned_files),
            'files': cleaned_files,
            'message': f'Auto cleanup completed: {len(cleaned_files)} files removed'
        })
    except Exception as e:
        logger.error(f"Error during auto cleanup: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def init_admin(main_app):
    """Initialize admin system with the main Flask app"""
    # Initialize metrics database
    init_metrics_db()
    
    logger.info("Admin system initialized")

if __name__ == '__main__':
    # Initialize metrics database
    init_metrics_db()
    
    # For standalone testing, create a Flask app
    from flask import Flask
    test_app = Flask(__name__)
    test_app.secret_key = ADMIN_SECRET_KEY
    test_app.register_blueprint(admin_app, url_prefix='/admin')
    
    # Start admin server
    test_app.run(debug=False, host='127.0.0.1', port=5001)