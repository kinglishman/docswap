#!/usr/bin/env python3
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
