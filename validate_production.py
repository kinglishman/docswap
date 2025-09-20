#!/usr/bin/env python3
"""
DocSwap Production Environment Validator
Validates production deployment requirements and security configurations
"""

import os
import sys
import json
import subprocess
import requests
import time
from pathlib import Path
from datetime import datetime

class ProductionValidator:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.passed = []
        self.base_path = Path(__file__).parent
        
    def log_error(self, message):
        self.errors.append(f"❌ ERROR: {message}")
        
    def log_warning(self, message):
        self.warnings.append(f"⚠️  WARNING: {message}")
        
    def log_pass(self, message):
        self.passed.append(f"✅ PASS: {message}")
    
    def validate_environment_variables(self):
        """Validate required environment variables"""
        print("🔍 Validating environment variables...")
        
        required_vars = [
            'SECRET_KEY',
            'SUPABASE_URL',
            'SUPABASE_SERVICE_KEY',
            'SUPABASE_ANON_KEY',
            'SUPABASE_JWT_SECRET'
        ]
        
        for var in required_vars:
            value = os.environ.get(var)
            if not value:
                self.log_error(f"Missing required environment variable: {var}")
            elif var == 'SECRET_KEY' and value == 'dev-key-change-in-production':
                self.log_error("SECRET_KEY is still set to development default")
            else:
                self.log_pass(f"Environment variable {var} is set")
    
    def validate_file_structure(self):
        """Validate required files and directories exist"""
        print("📁 Validating file structure...")
        
        required_files = [
            'app.py',
            'admin.py',
            'gunicorn.conf.py',
            'nginx.conf',
            'supervisor.conf',
            'start_production.sh',
            'cleanup_files.py',
            'security_config.py',
            'requirements.txt'
        ]
        
        required_dirs = [
            'uploads',
            'output',
            'logs',
            'css',
            'js'
        ]
        
        for file in required_files:
            file_path = self.base_path / file
            if file_path.exists():
                self.log_pass(f"Required file exists: {file}")
            else:
                self.log_error(f"Missing required file: {file}")
        
        for dir_name in required_dirs:
            dir_path = self.base_path / dir_name
            if dir_path.exists() and dir_path.is_dir():
                self.log_pass(f"Required directory exists: {dir_name}")
            else:
                self.log_error(f"Missing required directory: {dir_name}")
    
    def validate_file_permissions(self):
        """Validate file permissions for security"""
        print("🔒 Validating file permissions...")
        
        executable_files = [
            'start_production.sh',
            'cleanup_files.py'
        ]
        
        for file in executable_files:
            file_path = self.base_path / file
            if file_path.exists():
                if os.access(file_path, os.X_OK):
                    self.log_pass(f"File is executable: {file}")
                else:
                    self.log_error(f"File is not executable: {file}")
    
    def validate_dependencies(self):
        """Validate Python dependencies"""
        print("📦 Validating Python dependencies...")
        
        try:
            with open(self.base_path / 'requirements.txt', 'r') as f:
                requirements = f.read().strip().split('\n')
            
            for req in requirements:
                if req.strip() and not req.startswith('#'):
                    package = req.split('==')[0].split('>=')[0].split('<=')[0]
                    try:
                        __import__(package.replace('-', '_'))
                        self.log_pass(f"Package installed: {package}")
                    except ImportError:
                        self.log_error(f"Missing package: {package}")
                        
        except FileNotFoundError:
            self.log_error("requirements.txt file not found")
    
    def validate_application_health(self):
        """Validate application health and endpoints"""
        print("🏥 Validating application health...")
        
        # Check if application is running
        try:
            response = requests.get('http://localhost:5002/health', timeout=10)
            if response.status_code == 200:
                health_data = response.json()
                self.log_pass("Health endpoint is accessible")
                
                if health_data.get('status') == 'healthy':
                    self.log_pass("Application reports healthy status")
                else:
                    self.log_warning(f"Application status: {health_data.get('status')}")
                
                if health_data.get('conversion_system'):
                    self.log_pass("Conversion system is available")
                else:
                    self.log_warning("Conversion system is not available")
                    
            else:
                self.log_error(f"Health endpoint returned status {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.log_error(f"Cannot connect to application: {e}")
    
    def validate_security_configuration(self):
        """Validate security configurations"""
        print("🛡️  Validating security configuration...")
        
        # Check if security config exists
        security_config_path = self.base_path / 'security_config.py'
        if security_config_path.exists():
            self.log_pass("Security configuration file exists")
        else:
            self.log_error("Security configuration file missing")
        
        # Test security headers
        try:
            response = requests.get('http://localhost:5002/', timeout=10)
            headers = response.headers
            
            security_headers = [
                'X-Content-Type-Options',
                'X-Frame-Options',
                'X-XSS-Protection'
            ]
            
            for header in security_headers:
                if header in headers:
                    self.log_pass(f"Security header present: {header}")
                else:
                    self.log_warning(f"Missing security header: {header}")
                    
        except requests.exceptions.RequestException:
            self.log_warning("Cannot test security headers - application not accessible")
    
    def validate_logging_configuration(self):
        """Validate logging setup"""
        print("📝 Validating logging configuration...")
        
        log_dir = self.base_path / 'logs'
        if log_dir.exists():
            self.log_pass("Logs directory exists")
            
            # Check for log files
            log_files = list(log_dir.glob('*.log'))
            if log_files:
                self.log_pass(f"Found {len(log_files)} log files")
            else:
                self.log_warning("No log files found")
        else:
            self.log_error("Logs directory missing")
    
    def validate_nginx_configuration(self):
        """Validate Nginx configuration"""
        print("🌐 Validating Nginx configuration...")
        
        nginx_conf = self.base_path / 'nginx.conf'
        if nginx_conf.exists():
            self.log_pass("Nginx configuration file exists")
            
            # Basic validation of nginx config
            try:
                with open(nginx_conf, 'r') as f:
                    content = f.read()
                
                required_directives = [
                    'upstream',
                    'proxy_pass',
                    'client_max_body_size',
                    'rate_limit'
                ]
                
                for directive in required_directives:
                    if directive in content:
                        self.log_pass(f"Nginx directive found: {directive}")
                    else:
                        self.log_warning(f"Nginx directive missing: {directive}")
                        
            except Exception as e:
                self.log_error(f"Error reading nginx config: {e}")
        else:
            self.log_error("Nginx configuration file missing")
    
    def validate_supervisor_configuration(self):
        """Validate Supervisor configuration"""
        print("👥 Validating Supervisor configuration...")
        
        supervisor_conf = self.base_path / 'supervisor.conf'
        if supervisor_conf.exists():
            self.log_pass("Supervisor configuration file exists")
            
            try:
                with open(supervisor_conf, 'r') as f:
                    content = f.read()
                
                required_sections = [
                    '[program:docswap]',
                    '[program:docswap-cleanup]'
                ]
                
                for section in required_sections:
                    if section in content:
                        self.log_pass(f"Supervisor section found: {section}")
                    else:
                        self.log_warning(f"Supervisor section missing: {section}")
                        
            except Exception as e:
                self.log_error(f"Error reading supervisor config: {e}")
        else:
            self.log_error("Supervisor configuration file missing")
    
    def validate_ssl_readiness(self):
        """Validate SSL/TLS readiness"""
        print("🔐 Validating SSL/TLS readiness...")
        
        # Check if SSL setup script exists
        ssl_script = self.base_path / 'setup_nginx_ssl.sh'
        if ssl_script.exists():
            self.log_pass("SSL setup script exists")
        else:
            self.log_warning("SSL setup script missing")
        
        # Check for SSL environment variables
        ssl_vars = ['SSL_CERT_PATH', 'SSL_KEY_PATH', 'DOMAIN_NAME']
        ssl_configured = False
        
        for var in ssl_vars:
            if os.environ.get(var):
                ssl_configured = True
                self.log_pass(f"SSL environment variable set: {var}")
        
        if not ssl_configured:
            self.log_warning("No SSL environment variables configured")
    
    def run_validation(self):
        """Run all validation checks"""
        print("🚀 Starting DocSwap Production Validation")
        print("=" * 50)
        
        validation_methods = [
            self.validate_environment_variables,
            self.validate_file_structure,
            self.validate_file_permissions,
            self.validate_dependencies,
            self.validate_application_health,
            self.validate_security_configuration,
            self.validate_logging_configuration,
            self.validate_nginx_configuration,
            self.validate_supervisor_configuration,
            self.validate_ssl_readiness
        ]
        
        for method in validation_methods:
            try:
                method()
            except Exception as e:
                self.log_error(f"Validation error in {method.__name__}: {e}")
            print()
        
        # Print summary
        print("📊 VALIDATION SUMMARY")
        print("=" * 50)
        
        print(f"✅ Passed: {len(self.passed)}")
        print(f"⚠️  Warnings: {len(self.warnings)}")
        print(f"❌ Errors: {len(self.errors)}")
        print()
        
        if self.errors:
            print("ERRORS:")
            for error in self.errors:
                print(f"  {error}")
            print()
        
        if self.warnings:
            print("WARNINGS:")
            for warning in self.warnings:
                print(f"  {warning}")
            print()
        
        # Determine overall status
        if self.errors:
            print("🔴 VALIDATION FAILED - Please fix errors before deploying to production")
            return False
        elif self.warnings:
            print("🟡 VALIDATION PASSED WITH WARNINGS - Review warnings before production deployment")
            return True
        else:
            print("🟢 VALIDATION PASSED - Ready for production deployment!")
            return True

def main():
    """Main function"""
    validator = ProductionValidator()
    success = validator.run_validation()
    
    # Generate validation report
    report = {
        'timestamp': datetime.now().isoformat(),
        'status': 'PASS' if success else 'FAIL',
        'passed': len(validator.passed),
        'warnings': len(validator.warnings),
        'errors': len(validator.errors),
        'details': {
            'passed': validator.passed,
            'warnings': validator.warnings,
            'errors': validator.errors
        }
    }
    
    # Save report
    report_path = Path(__file__).parent / 'validation_report.json'
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📄 Validation report saved to: {report_path}")
    
    return 0 if success else 1

if __name__ == '__main__':
    sys.exit(main())