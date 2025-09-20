#!/usr/bin/env python3
"""
Test script for admin functionality
"""
import requests
import sys

def test_admin_functionality():
    """Test admin routes and functionality"""
    base_url = "http://localhost:5002"
    
    print("🔧 Testing Admin Functionality")
    print("=" * 50)
    
    # Test admin login page
    print("\n1. Testing admin login page...")
    try:
        response = requests.get(f"{base_url}/admin/login")
        print(f"   Status: {response.status_code}")
        if "admin" in response.text.lower() or "login" in response.text.lower():
            print("   ✅ Admin login page accessible")
        else:
            print("   ❌ Admin login page not showing admin content")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test admin login with credentials
    print("\n2. Testing admin login with credentials...")
    try:
        session = requests.Session()
        login_data = {
            'username': 'admin',
            'password': 'change_me_in_production'
        }
        response = session.post(f"{base_url}/admin/login", data=login_data, allow_redirects=False)
        print(f"   Status: {response.status_code}")
        if response.status_code == 302:
            print("   ✅ Login successful (redirect)")
        elif response.status_code == 200:
            if "dashboard" in response.text.lower():
                print("   ✅ Login successful (dashboard)")
            else:
                print("   ❌ Login failed or invalid response")
        else:
            print(f"   ❌ Unexpected status code: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test admin dashboard access
    print("\n3. Testing admin dashboard access...")
    try:
        response = session.get(f"{base_url}/admin/dashboard")
        print(f"   Status: {response.status_code}")
        if "dashboard" in response.text.lower() or "admin" in response.text.lower():
            print("   ✅ Admin dashboard accessible")
        else:
            print("   ❌ Admin dashboard not accessible")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test admin API endpoints
    print("\n4. Testing admin API endpoints...")
    endpoints = [
        "/admin/api/health",
        "/admin/api/metrics",
        "/admin/api/logs"
    ]
    
    for endpoint in endpoints:
        try:
            response = session.get(f"{base_url}{endpoint}")
            print(f"   {endpoint}: {response.status_code}")
            if response.status_code == 200:
                print(f"     ✅ Accessible")
            elif response.status_code == 401 or response.status_code == 403:
                print(f"     ⚠️  Authentication required")
            else:
                print(f"     ❌ Error")
        except Exception as e:
            print(f"   {endpoint}: ❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("Admin functionality test completed!")

if __name__ == "__main__":
    test_admin_functionality()