#!/usr/bin/env python3
"""
DocSwap Security Configuration
Production security settings and hardening configurations
"""

import os
import secrets
import hashlib
from datetime import timedelta

class SecurityConfig:
    """Production security configuration class"""
    
    # Security Headers
    SECURITY_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://*.supabase.co; "
            "child-src 'self'; "
            "frame-src 'self'; "
            "frame-ancestors 'self'; "
            "base-uri 'self'; "
            "form-action 'self'"
        ),
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': (
            "geolocation=(), microphone=(), camera=(), "
            "payment=(), usb=(), magnetometer=(), gyroscope=()"
        )
    }
    
    # File Upload Security
    MAX_FILE_SIZE = int(os.environ.get('MAX_FILE_SIZE', 104857600))  # 100MB
    ALLOWED_EXTENSIONS = {
        'pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt',
        'jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'gif', 'svg',
        'txt', 'html', 'csv', 'json'
    }
    
    # Rate Limiting
    RATE_LIMITS = {
        'upload': '10 per minute',
        'convert': '5 per minute',
        'download': '20 per minute',
        'api': '60 per minute',
        'admin': '30 per minute'
    }
    
    # Session Security
    SESSION_CONFIG = {
        'SESSION_COOKIE_SECURE': True,
        'SESSION_COOKIE_HTTPONLY': True,
        'SESSION_COOKIE_SAMESITE': 'Lax',
        'PERMANENT_SESSION_LIFETIME': timedelta(hours=24),
        'SESSION_COOKIE_NAME': 'docswap_session'
    }
    
    # JWT Security
    JWT_CONFIG = {
        'JWT_ACCESS_TOKEN_EXPIRES': timedelta(hours=1),
        'JWT_REFRESH_TOKEN_EXPIRES': timedelta(days=30),
        'JWT_ALGORITHM': 'HS256',
        'JWT_SECRET_KEY': os.environ.get('JWT_SECRET_KEY', secrets.token_urlsafe(32))
    }
    
    # File System Security
    FILESYSTEM_CONFIG = {
        'UPLOAD_FOLDER_PERMISSIONS': 0o755,
        'OUTPUT_FOLDER_PERMISSIONS': 0o755,
        'FILE_PERMISSIONS': 0o644,
        'MAX_FILENAME_LENGTH': 255,
        'ALLOWED_FILENAME_CHARS': r'^[a-zA-Z0-9._-]+$'
    }
    
    # Admin Security
    ADMIN_CONFIG = {
        'ADMIN_SESSION_TIMEOUT': timedelta(hours=2),
        'MAX_LOGIN_ATTEMPTS': 5,
        'LOGIN_ATTEMPT_WINDOW': timedelta(minutes=15),
        'REQUIRE_2FA': os.environ.get('REQUIRE_2FA', 'false').lower() == 'true',
        'ADMIN_IP_WHITELIST': os.environ.get('ADMIN_IP_WHITELIST', '').split(',') if os.environ.get('ADMIN_IP_WHITELIST') else []
    }
    
    # Database Security
    DATABASE_CONFIG = {
        'CONNECTION_TIMEOUT': 30,
        'MAX_CONNECTIONS': 20,
        'SSL_MODE': 'require',
        'QUERY_TIMEOUT': 30
    }
    
    # Logging Security
    LOGGING_CONFIG = {
        'LOG_LEVEL': 'INFO',
        'LOG_FORMAT': '%(asctime)s %(levelname)s %(name)s %(message)s',
        'LOG_ROTATION': 'daily',
        'LOG_RETENTION_DAYS': 30,
        'SENSITIVE_FIELDS': ['password', 'token', 'key', 'secret', 'auth']
    }
    
    @staticmethod
    def generate_secret_key():
        """Generate a secure secret key"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using secure method"""
        salt = secrets.token_hex(16)
        password_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return f"{salt}:{password_hash.hex()}"
    
    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        """Verify password against hash"""
        try:
            salt, password_hash = hashed.split(':')
            return hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex() == password_hash
        except ValueError:
            return False
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename for security"""
        import re
        # Remove path separators and dangerous characters
        filename = re.sub(r'[<>:"/\\|?*]', '', filename)
        # Limit length
        if len(filename) > SecurityConfig.FILESYSTEM_CONFIG['MAX_FILENAME_LENGTH']:
            name, ext = os.path.splitext(filename)
            max_name_len = SecurityConfig.FILESYSTEM_CONFIG['MAX_FILENAME_LENGTH'] - len(ext)
            filename = name[:max_name_len] + ext
        return filename
    
    @staticmethod
    def is_safe_path(path: str, base_path: str) -> bool:
        """Check if path is safe (no directory traversal)"""
        try:
            abs_path = os.path.abspath(path)
            abs_base = os.path.abspath(base_path)
            return abs_path.startswith(abs_base)
        except (OSError, ValueError):
            return False
    
    @staticmethod
    def get_client_ip(request) -> str:
        """Get real client IP address"""
        # Check for forwarded headers (when behind proxy)
        forwarded_ips = request.headers.get('X-Forwarded-For')
        if forwarded_ips:
            return forwarded_ips.split(',')[0].strip()
        
        real_ip = request.headers.get('X-Real-IP')
        if real_ip:
            return real_ip
        
        return request.remote_addr
    
    @staticmethod
    def validate_file_type(file_path: str, expected_extension: str) -> bool:
        """Validate file type using magic numbers"""
        try:
            import magic
            mime_type = magic.from_file(file_path, mime=True)
            
            # Define expected MIME types for extensions
            mime_mapping = {
                'pdf': 'application/pdf',
                'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'bmp': 'image/bmp',
                'tiff': 'image/tiff',
                'webp': 'image/webp',
                'txt': 'text/plain',
                'html': 'text/html',
                'csv': 'text/csv'
            }
            
            expected_mime = mime_mapping.get(expected_extension.lower())
            return mime_type == expected_mime if expected_mime else True
            
        except ImportError:
            # Fallback if python-magic is not available
            return True
    
    @staticmethod
    def apply_security_headers(response):
        """Apply security headers to Flask response"""
        for header, value in SecurityConfig.SECURITY_HEADERS.items():
            response.headers[header] = value
        return response

def configure_flask_security(app):
    """Configure Flask app with security settings"""
    
    # Apply session configuration
    for key, value in SecurityConfig.SESSION_CONFIG.items():
        app.config[key] = value
    
    # Set secure secret key
    if not app.config.get('SECRET_KEY') or app.config['SECRET_KEY'] == 'dev-key-change-in-production':
        app.config['SECRET_KEY'] = SecurityConfig.generate_secret_key()
    
    # Apply security headers to all responses
    @app.after_request
    def apply_security_headers(response):
        return SecurityConfig.apply_security_headers(response)
    
    # Disable server header
    @app.after_request
    def remove_server_header(response):
        response.headers.pop('Server', None)
        return response
    
    return app

if __name__ == '__main__':
    # Test security functions
    print("Testing security configuration...")
    
    # Test password hashing
    password = "test_password_123"
    hashed = SecurityConfig.hash_password(password)
    print(f"Password hashed: {len(hashed)} characters")
    print(f"Password verification: {SecurityConfig.verify_password(password, hashed)}")
    
    # Test filename sanitization
    unsafe_filename = "../../../etc/passwd"
    safe_filename = SecurityConfig.sanitize_filename(unsafe_filename)
    print(f"Sanitized filename: {safe_filename}")
    
    # Test path safety
    base_path = "/var/www/docswap"
    test_path = "/var/www/docswap/uploads/file.pdf"
    unsafe_path = "/var/www/docswap/../../../etc/passwd"
    print(f"Safe path test: {SecurityConfig.is_safe_path(test_path, base_path)}")
    print(f"Unsafe path test: {SecurityConfig.is_safe_path(unsafe_path, base_path)}")
    
    print("Security configuration test completed!")