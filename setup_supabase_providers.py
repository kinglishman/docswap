#!/usr/bin/env python3
"""
Supabase Provider Setup and Monitoring Script

This script helps ensure your Supabase authentication providers are properly
configured and provides automated monitoring to prevent provider issues.

Usage: python3 setup_supabase_providers.py
"""

import os
import sys
import requests
import json
from dotenv import load_dotenv
from datetime import datetime
import time

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

def print_header(title):
    """Print a formatted header"""
    print(f"\n{Colors.BOLD}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{title.center(60)}{Colors.END}")
    print(f"{Colors.BOLD}{'='*60}{Colors.END}")

def check_provider_status():
    """Check current provider status"""
    print_header("🔍 CHECKING CURRENT PROVIDER STATUS")
    
    supabase_url = os.getenv('SUPABASE_URL')
    service_key = os.getenv('SUPABASE_SERVICE_KEY')
    
    if not supabase_url or not service_key:
        print_status("Missing Supabase URL or Service Key", 'error')
        return None
    
    try:
        headers = {
            'apikey': service_key,
            'Authorization': f'Bearer {service_key}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get(f"{supabase_url}/auth/v1/settings", headers=headers, timeout=10)
        
        if response.status_code == 200:
            settings = response.json()
            
            # Email provider status
            email_enabled = settings.get('email_enabled', False)
            print_status(f"Email Provider: {'Enabled' if email_enabled else 'Disabled'}", 
                        'success' if email_enabled else 'error')
            
            # External providers
            external_providers = settings.get('external', {})
            
            google_enabled = external_providers.get('google', {}).get('enabled', False)
            print_status(f"Google Provider: {'Enabled' if google_enabled else 'Disabled'}", 
                        'success' if google_enabled else 'error')
            
            return {
                'email_enabled': email_enabled,
                'google_enabled': google_enabled,
                'settings': settings
            }
        else:
            print_status(f"Failed to fetch settings: HTTP {response.status_code}", 'error')
            return None
            
    except Exception as e:
        print_status(f"Error checking providers: {str(e)}", 'error')
        return None

def provide_manual_setup_instructions():
    """Provide step-by-step manual setup instructions"""
    print_header("📋 MANUAL SETUP INSTRUCTIONS")
    
    supabase_url = os.getenv('SUPABASE_URL')
    project_ref = supabase_url.split('//')[1].split('.')[0] if supabase_url else 'YOUR_PROJECT_REF'
    
    print(f"{Colors.BOLD}🔗 Supabase Dashboard Links:{Colors.END}")
    print(f"   Main Dashboard: https://supabase.com/dashboard/project/{project_ref}")
    print(f"   Auth Providers: https://supabase.com/dashboard/project/{project_ref}/auth/providers")
    print(f"   Auth Settings:  https://supabase.com/dashboard/project/{project_ref}/auth/settings")
    
    print(f"\n{Colors.BOLD}📧 Email Provider Setup:{Colors.END}")
    print("   1. Go to Authentication → Providers")
    print("   2. Find 'Email' in the list")
    print("   3. Ensure the toggle switch is ON (enabled)")
    print("   4. Click 'Save' if you made changes")
    
    print(f"\n{Colors.BOLD}🔍 Google Provider Setup:{Colors.END}")
    print("   1. Go to Authentication → Providers")
    print("   2. Find 'Google' in the list")
    print("   3. Click on Google to expand settings")
    print("   4. Ensure the toggle switch is ON (enabled)")
    print("   5. If not configured, you'll need:")
    print("      - Google Cloud Console project")
    print("      - OAuth 2.0 Client ID and Secret")
    print(f"      - Redirect URI: https://{project_ref}.supabase.co/auth/v1/callback")
    print("   6. Enter Client ID and Client Secret")
    print("   7. Click 'Save'")
    
    print(f"\n{Colors.BOLD}⚠️  IMPORTANT NOTES:{Colors.END}")
    print("   • Always click 'Save' after making changes")
    print("   • Wait 1-2 minutes for changes to propagate")
    print("   • Test authentication after enabling providers")
    print("   • Keep this script for regular monitoring")

def create_monitoring_script():
    """Create a monitoring script for regular checks"""
    print_header("🤖 CREATING MONITORING SCRIPT")
    
    monitor_script = '''#!/usr/bin/env python3
"""
Supabase Provider Monitor

Run this script regularly (e.g., daily) to ensure providers stay enabled.
Usage: python3 monitor_supabase_providers.py
"""

import os
import sys
import requests
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

def check_and_alert():
    """Check providers and alert if disabled"""
    supabase_url = os.getenv('SUPABASE_URL')
    service_key = os.getenv('SUPABASE_SERVICE_KEY')
    
    if not supabase_url or not service_key:
        print("❌ Missing Supabase credentials")
        return False
    
    try:
        headers = {
            'apikey': service_key,
            'Authorization': f'Bearer {service_key}'
        }
        
        response = requests.get(f"{supabase_url}/auth/v1/settings", headers=headers, timeout=10)
        
        if response.status_code == 200:
            settings = response.json()
            
            email_enabled = settings.get('email_enabled', False)
            google_enabled = settings.get('external', {}).get('google', {}).get('enabled', False)
            
            issues = []
            if not email_enabled:
                issues.append('Email provider disabled')
            if not google_enabled:
                issues.append('Google provider disabled')
            
            if issues:
                print(f"🚨 ALERT: {', '.join(issues)}")
                print("📋 Action required: Enable providers in Supabase dashboard")
                print(f"🔗 Dashboard: https://supabase.com/dashboard/project/{supabase_url.split('//')[1].split('.')[0]}/auth/providers")
                return False
            else:
                print("✅ All providers enabled")
                return True
        else:
            print(f"❌ API Error: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == '__main__':
    print(f"Supabase Provider Monitor - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    check_and_alert()
'''
    
    with open('monitor_supabase_providers.py', 'w') as f:
        f.write(monitor_script)
    
    # Make it executable
    os.chmod('monitor_supabase_providers.py', 0o755)
    
    print_status("Monitor script created: monitor_supabase_providers.py", 'success')
    print_status("Run it with: python3 monitor_supabase_providers.py", 'info')

def create_cron_instructions():
    """Create instructions for automated monitoring"""
    print_header("⏰ AUTOMATED MONITORING SETUP")
    
    cron_content = f'''# Add this to your crontab to run monitoring every hour
# Run: crontab -e
# Add this line:
0 * * * * cd {os.getcwd()} && python3 monitor_supabase_providers.py >> supabase_monitor.log 2>&1

# Or for daily monitoring at 9 AM:
0 9 * * * cd {os.getcwd()} && python3 monitor_supabase_providers.py >> supabase_monitor.log 2>&1

# To view the log:
# tail -f supabase_monitor.log
'''
    
    with open('cron_setup_instructions.txt', 'w') as f:
        f.write(cron_content)
    
    print_status("Cron instructions created: cron_setup_instructions.txt", 'success')
    print("\n📅 To set up automated monitoring:")
    print("   1. Run: crontab -e")
    print(f"   2. Add: 0 9 * * * cd {os.getcwd()} && python3 monitor_supabase_providers.py >> supabase_monitor.log 2>&1")
    print("   3. Save and exit")
    print("   4. Monitor with: tail -f supabase_monitor.log")

def create_troubleshooting_guide():
    """Create a troubleshooting guide"""
    print_header("🔧 CREATING TROUBLESHOOTING GUIDE")
    
    guide_content = '''# Supabase Authentication Troubleshooting Guide

## Common Issues and Solutions

### 1. "Provider not enabled" Error

**Symptoms:**
- Authentication modal shows but login fails
- Console errors about disabled providers
- Users cannot sign in/up

**Solution:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Ensure Email provider toggle is ON
3. Ensure Google provider toggle is ON (if using)
4. Click "Save" after any changes
5. Wait 1-2 minutes for propagation
6. Test authentication

### 2. Google Authentication Not Working

**Symptoms:**
- Google sign-in button doesn't work
- Redirect errors
- "OAuth error" messages

**Solution:**
1. Verify Google Cloud Console setup:
   - OAuth 2.0 Client ID exists
   - Authorized redirect URIs include: https://[PROJECT_REF].supabase.co/auth/v1/callback
   - Client ID and Secret are correct
2. In Supabase Dashboard:
   - Google provider is enabled
   - Client ID and Secret are entered correctly
   - Configuration is saved

### 3. Environment Variable Issues

**Symptoms:**
- "Configuration failed to load" errors
- API connection failures
- Missing credentials warnings

**Solution:**
1. Check .env file exists and has correct values
2. Verify SUPABASE_URL matches your project URL exactly
3. Ensure SUPABASE_ANON_KEY is the correct anon/public key
4. Verify SUPABASE_SERVICE_KEY is the service role key
5. Restart your application after .env changes

### 4. CORS Errors

**Symptoms:**
- "CORS policy" errors in browser console
- Authentication requests blocked

**Solution:**
1. Go to Supabase Dashboard → Project Settings → API
2. Add your domain to CORS allowed origins
3. For development, add: http://localhost:5002
4. Save settings and wait for propagation

### 5. JWT Verification Failures

**Symptoms:**
- "Invalid JWT" errors
- Backend authentication failures
- Token verification errors

**Solution:**
1. Verify SUPABASE_JWT_SECRET matches Project Settings → API → JWT Settings
2. Ensure service role key is correct
3. Check token is being passed correctly in requests
4. Verify token hasn't expired

## Prevention Checklist

- [ ] Run monitor_supabase_providers.py daily
- [ ] Set up automated monitoring with cron
- [ ] Keep backup of configuration settings
- [ ] Test authentication after any Supabase changes
- [ ] Monitor Supabase status page for service issues
- [ ] Review authentication logs regularly

## Emergency Recovery Steps

1. **Check Supabase Status**: https://status.supabase.com/
2. **Verify Provider Settings**: Dashboard → Authentication → Providers
3. **Test API Connectivity**: Run verify_supabase_config.py
4. **Check Environment Variables**: Ensure all values are correct
5. **Review Recent Changes**: Check deployment logs
6. **Contact Support**: If all else fails, contact Supabase support

## Useful Commands

```bash
# Check configuration
python3 verify_supabase_config.py

# Monitor providers
python3 monitor_supabase_providers.py

# Test API endpoint
curl -X GET "http://localhost:5002/api/config" | jq

# Check environment variables
env | grep SUPABASE
```

## Contact Information

- Supabase Documentation: https://supabase.com/docs
- Supabase Support: https://supabase.com/support
- Community Discord: https://discord.supabase.com/
'''
    
    with open('SUPABASE_TROUBLESHOOTING.md', 'w') as f:
        f.write(guide_content)
    
    print_status("Troubleshooting guide created: SUPABASE_TROUBLESHOOTING.md", 'success')

def main():
    """Main setup function"""
    print(f"{Colors.BOLD}🚀 Supabase Provider Setup & Monitoring Tool{Colors.END}")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check current status
    status = check_provider_status()
    
    # Provide manual setup instructions
    provide_manual_setup_instructions()
    
    # Create monitoring tools
    create_monitoring_script()
    create_cron_instructions()
    create_troubleshooting_guide()
    
    print_header("✨ SETUP COMPLETE")
    
    print(f"{Colors.BOLD}📁 Files Created:{Colors.END}")
    print("   • monitor_supabase_providers.py - Daily monitoring script")
    print("   • cron_setup_instructions.txt - Automated monitoring setup")
    print("   • SUPABASE_TROUBLESHOOTING.md - Comprehensive troubleshooting guide")
    
    print(f"\n{Colors.BOLD}🎯 Next Steps:{Colors.END}")
    print("   1. Follow the manual setup instructions above")
    print("   2. Enable all required providers in Supabase dashboard")
    print("   3. Test authentication thoroughly")
    print("   4. Set up automated monitoring with cron")
    print("   5. Run monitor script daily: python3 monitor_supabase_providers.py")
    
    if status:
        if not status['email_enabled'] or not status['google_enabled']:
            print(f"\n{Colors.YELLOW}⚠️  ACTION REQUIRED: Some providers are disabled!{Colors.END}")
            print("   Please enable them in the Supabase dashboard now.")
        else:
            print(f"\n{Colors.GREEN}✅ All providers are currently enabled!{Colors.END}")
    
    print(f"\n{Colors.BOLD}🔗 Quick Links:{Colors.END}")
    supabase_url = os.getenv('SUPABASE_URL')
    if supabase_url:
        project_ref = supabase_url.split('//')[1].split('.')[0]
        print(f"   Dashboard: https://supabase.com/dashboard/project/{project_ref}")
        print(f"   Providers: https://supabase.com/dashboard/project/{project_ref}/auth/providers")

if __name__ == '__main__':
    main()