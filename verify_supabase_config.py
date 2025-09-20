#!/usr/bin/env python3
"""
Supabase Configuration Verification Script

This script verifies that your Supabase configuration is correct and all
authentication providers are properly enabled.

Usage: python3 verify_supabase_config.py
"""

import os
import sys
import requests
import json
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_status(message, status='info'):
    """Print colored status messages"""
    if status == 'success':
        print(f"{Colors.GREEN}✅ {message}{Colors.END}")
    elif status == 'error':
        print(f"{Colors.RED}❌ {message}{Colors.END}")
    elif status == 'warning':
        print(f"{Colors.YELLOW}⚠️  {message}{Colors.END}")
    else:
        print(f"{Colors.BLUE}ℹ️  {message}{Colors.END}")

def check_environment_variables():
    """Check if all required environment variables are set"""
    print(f"\n{Colors.BOLD}🔍 Checking Environment Variables{Colors.END}")
    
    required_vars = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_KEY',
        'SUPABASE_JWT_SECRET'
    ]
    
    missing_vars = []
    
    for var in required_vars:
        value = os.getenv(var)
        if value:
            # Mask sensitive values
            if 'KEY' in var or 'SECRET' in var:
                masked_value = value[:10] + '...' + value[-10:] if len(value) > 20 else value[:5] + '...'
                print_status(f"{var}: {masked_value}", 'success')
            else:
                print_status(f"{var}: {value}", 'success')
        else:
            print_status(f"{var}: Not set", 'error')
            missing_vars.append(var)
    
    if missing_vars:
        print_status(f"Missing environment variables: {', '.join(missing_vars)}", 'error')
        return False
    
    return True

def check_supabase_connection():
    """Test connection to Supabase"""
    print(f"\n{Colors.BOLD}🌐 Testing Supabase Connection{Colors.END}")
    
    supabase_url = os.getenv('SUPABASE_URL')
    anon_key = os.getenv('SUPABASE_ANON_KEY')
    
    if not supabase_url or not anon_key:
        print_status("Cannot test connection - missing URL or key", 'error')
        return False
    
    try:
        # Test basic connection
        headers = {
            'apikey': anon_key,
            'Authorization': f'Bearer {anon_key}'
        }
        
        response = requests.get(f"{supabase_url}/rest/v1/", headers=headers, timeout=10)
        
        if response.status_code == 200:
            print_status("Supabase API connection successful", 'success')
            return True
        else:
            print_status(f"Supabase API connection failed: {response.status_code}", 'error')
            return False
            
    except requests.exceptions.RequestException as e:
        print_status(f"Connection error: {str(e)}", 'error')
        return False

def check_auth_providers():
    """Check authentication provider configuration"""
    print(f"\n{Colors.BOLD}🔐 Checking Authentication Providers{Colors.END}")
    
    supabase_url = os.getenv('SUPABASE_URL')
    service_key = os.getenv('SUPABASE_SERVICE_KEY')
    
    if not supabase_url or not service_key:
        print_status("Cannot check providers - missing URL or service key", 'error')
        return False
    
    try:
        headers = {
            'apikey': service_key,
            'Authorization': f'Bearer {service_key}',
            'Content-Type': 'application/json'
        }
        
        # Check auth settings
        response = requests.get(f"{supabase_url}/auth/v1/settings", headers=headers, timeout=10)
        
        if response.status_code == 200:
            settings = response.json()
            
            # Check email provider
            if settings.get('email_enabled', False):
                print_status("Email authentication: Enabled", 'success')
            else:
                print_status("Email authentication: Disabled", 'warning')
            
            # Check external providers
            external_providers = settings.get('external', {})
            
            if 'google' in external_providers and external_providers['google'].get('enabled', False):
                print_status("Google authentication: Enabled", 'success')
            else:
                print_status("Google authentication: Disabled or not configured", 'warning')
            
            return True
        else:
            print_status(f"Failed to fetch auth settings: {response.status_code}", 'error')
            return False
            
    except requests.exceptions.RequestException as e:
        print_status(f"Error checking providers: {str(e)}", 'error')
        return False

def check_local_server():
    """Check if local server is running and serving config correctly"""
    print(f"\n{Colors.BOLD}🖥️  Checking Local Server Configuration{Colors.END}")
    
    try:
        response = requests.get('http://localhost:5002/api/config', timeout=5)
        
        if response.status_code == 200:
            config = response.json()
            
            if config.get('supabaseUrl') and config.get('supabaseAnonKey'):
                print_status("Local server config endpoint: Working", 'success')
                print_status(f"Serving URL: {config['supabaseUrl'][:30]}...", 'success')
                return True
            else:
                print_status("Local server config endpoint: Missing data", 'error')
                return False
        else:
            print_status(f"Local server config endpoint: HTTP {response.status_code}", 'error')
            return False
            
    except requests.exceptions.RequestException:
        print_status("Local server: Not running or not accessible", 'warning')
        print_status("Start server with: python3 app.py", 'info')
        return False

def generate_report():
    """Generate a configuration report"""
    print(f"\n{Colors.BOLD}📊 Configuration Report{Colors.END}")
    
    report = {
        'timestamp': datetime.now().isoformat(),
        'supabase_url': os.getenv('SUPABASE_URL', 'Not set'),
        'environment_check': 'Passed' if check_environment_variables() else 'Failed',
        'connection_check': 'Passed' if check_supabase_connection() else 'Failed',
        'providers_check': 'Passed' if check_auth_providers() else 'Failed',
        'server_check': 'Passed' if check_local_server() else 'Failed'
    }
    
    # Save report
    with open('supabase_config_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    print_status("Report saved to: supabase_config_report.json", 'success')
    
    return report

def main():
    """Main verification function"""
    print(f"{Colors.BOLD}🚀 Supabase Configuration Verification{Colors.END}")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Run all checks
    env_ok = check_environment_variables()
    conn_ok = check_supabase_connection() if env_ok else False
    providers_ok = check_auth_providers() if env_ok else False
    server_ok = check_local_server()
    
    # Generate report
    report = generate_report()
    
    # Summary
    print(f"\n{Colors.BOLD}📋 Summary{Colors.END}")
    
    if env_ok and conn_ok and providers_ok:
        print_status("All critical checks passed! ✨", 'success')
    else:
        print_status("Some checks failed. Please review the issues above.", 'error')
    
    if not server_ok:
        print_status("Local server check failed - this is normal if server isn't running", 'info')
    
    # Recommendations
    print(f"\n{Colors.BOLD}💡 Recommendations{Colors.END}")
    
    if not env_ok:
        print_status("Fix environment variables in .env file", 'info')
    
    if not conn_ok:
        print_status("Check Supabase project status and credentials", 'info')
    
    if not providers_ok:
        print_status("Enable authentication providers in Supabase dashboard", 'info')
    
    print_status("Run this script regularly to catch configuration issues early", 'info')
    print_status("See SUPABASE_CONFIGURATION_CHECKLIST.md for detailed setup guide", 'info')

if __name__ == '__main__':
    main()