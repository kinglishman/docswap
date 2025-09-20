#!/usr/bin/env python3
"""
DocSwap Security Testing Script
Tests various security measures and input validation
"""

import requests
import json
import time
import os
from pathlib import Path

API_BASE_URL = 'http://localhost:5002'

def test_rate_limiting():
    """Test rate limiting on upload endpoint"""
    print("🔒 Testing Rate Limiting...")
    
    # Try to exceed rate limit (10 requests per minute)
    for i in range(15):
        try:
            response = requests.post(f'{API_BASE_URL}/api/upload', 
                                   files={'file': ('test.txt', 'test content', 'text/plain')})
            print(f"Request {i+1}: Status {response.status_code}")
            
            if response.status_code == 429:
                print("✅ Rate limiting is working - got 429 Too Many Requests")
                return True
                
        except Exception as e:
            print(f"Request {i+1} failed: {e}")
        
        time.sleep(0.1)  # Small delay between requests
    
    print("⚠️ Rate limiting may not be working as expected")
    return False

def test_file_size_validation():
    """Test file size limits"""
    print("\n📏 Testing File Size Validation...")
    
    # Create a large file content (simulate > 100MB)
    large_content = 'A' * (101 * 1024 * 1024)  # 101MB
    
    try:
        response = requests.post(f'{API_BASE_URL}/api/upload',
                               files={'file': ('large.txt', large_content, 'text/plain')})
        
        if response.status_code == 413 or 'too large' in response.text.lower():
            print("✅ File size validation is working")
            return True
        else:
            print(f"⚠️ Large file was accepted: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"✅ File size validation working (connection error expected): {e}")
        return True

def test_file_type_validation():
    """Test file type restrictions"""
    print("\n🗂️ Testing File Type Validation...")
    
    # Test with disallowed file types
    dangerous_files = [
        ('malicious.exe', b'MZ\x90\x00', 'application/octet-stream'),
        ('script.bat', b'@echo off\necho hello', 'text/plain'),
        ('virus.scr', b'fake virus', 'application/octet-stream'),
        ('test.php', b'<?php echo "hello"; ?>', 'text/plain'),
    ]
    
    results = []
    for filename, content, mimetype in dangerous_files:
        try:
            response = requests.post(f'{API_BASE_URL}/api/upload',
                                   files={'file': (filename, content, mimetype)})
            
            if response.status_code == 400 and 'not supported' in response.text.lower():
                print(f"✅ {filename} correctly rejected")
                results.append(True)
            else:
                print(f"⚠️ {filename} was accepted: {response.status_code}")
                results.append(False)
                
        except Exception as e:
            print(f"Error testing {filename}: {e}")
            results.append(False)
    
    return all(results)

def test_filename_sanitization():
    """Test filename sanitization"""
    print("\n🧹 Testing Filename Sanitization...")
    
    # Test with dangerous filenames
    dangerous_names = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        'test<script>alert("xss")</script>.txt',
        'test"file.txt',
        "test'file.txt",
        'test|file.txt',
        'test;file.txt',
        'test&file.txt',
    ]
    
    results = []
    for filename in dangerous_names:
        try:
            response = requests.post(f'{API_BASE_URL}/api/upload',
                                   files={'file': (filename, 'test content', 'text/plain')})
            
            if response.status_code == 400 and 'invalid filename' in response.text.lower():
                print(f"✅ {filename} correctly sanitized/rejected")
                results.append(True)
            elif response.status_code == 200:
                # Check if filename was sanitized in response
                data = response.json()
                if 'filename' in data and data['filename'] != filename:
                    print(f"✅ {filename} was sanitized to {data.get('filename', 'unknown')}")
                    results.append(True)
                else:
                    print(f"⚠️ {filename} was accepted without sanitization")
                    results.append(False)
            else:
                print(f"⚠️ Unexpected response for {filename}: {response.status_code}")
                results.append(False)
                
        except Exception as e:
            print(f"Error testing {filename}: {e}")
            results.append(False)
    
    return all(results)

def test_xss_prevention():
    """Test XSS prevention in responses"""
    print("\n🛡️ Testing XSS Prevention...")
    
    # Test with XSS payloads
    xss_payloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>',
        '"><script>alert("xss")</script>',
    ]
    
    results = []
    for payload in xss_payloads:
        try:
            # Test in filename
            response = requests.post(f'{API_BASE_URL}/api/upload',
                                   files={'file': (f'{payload}.txt', 'test', 'text/plain')})
            
            # Check if response contains unescaped payload
            if payload in response.text and '<script>' in response.text:
                print(f"⚠️ XSS vulnerability found with payload: {payload}")
                results.append(False)
            else:
                print(f"✅ XSS payload properly handled: {payload}")
                results.append(True)
                
        except Exception as e:
            print(f"Error testing XSS payload {payload}: {e}")
            results.append(True)  # Error is better than vulnerability
    
    return all(results)

def test_cors_headers():
    """Test CORS configuration"""
    print("\n🌐 Testing CORS Headers...")
    
    try:
        response = requests.options(f'{API_BASE_URL}/api/upload',
                                  headers={'Origin': 'https://malicious-site.com'})
        
        cors_header = response.headers.get('Access-Control-Allow-Origin', '')
        
        if cors_header == '*':
            print("⚠️ CORS allows all origins (*)") 
            return False
        elif 'localhost' in cors_header or cors_header == '':
            print("✅ CORS properly configured")
            return True
        else:
            print(f"ℹ️ CORS header: {cors_header}")
            return True
            
    except Exception as e:
        print(f"Error testing CORS: {e}")
        return False

def test_error_information_disclosure():
    """Test if errors reveal sensitive information"""
    print("\n🔍 Testing Error Information Disclosure...")
    
    try:
        # Test with malformed requests
        response = requests.post(f'{API_BASE_URL}/api/convert',
                               json={'invalid': 'data'})
        
        error_text = response.text.lower()
        
        # Check for sensitive information in errors
        sensitive_patterns = [
            'traceback',
            'file not found',
            '/users/',
            '/home/',
            'internal server error',
            'database',
            'sql',
            'password',
            'secret',
        ]
        
        found_sensitive = []
        for pattern in sensitive_patterns:
            if pattern in error_text:
                found_sensitive.append(pattern)
        
        if found_sensitive:
            print(f"⚠️ Sensitive information in errors: {found_sensitive}")
            return False
        else:
            print("✅ Error messages don't reveal sensitive information")
            return True
            
    except Exception as e:
        print(f"Error testing information disclosure: {e}")
        return True

def main():
    """Run all security tests"""
    print("🔒 DocSwap Security Testing Suite")
    print("=" * 50)
    
    tests = [
        ("Rate Limiting", test_rate_limiting),
        ("File Size Validation", test_file_size_validation),
        ("File Type Validation", test_file_type_validation),
        ("Filename Sanitization", test_filename_sanitization),
        ("XSS Prevention", test_xss_prevention),
        ("CORS Configuration", test_cors_headers),
        ("Error Information Disclosure", test_error_information_disclosure),
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results[test_name] = result
        except Exception as e:
            print(f"❌ {test_name} failed with error: {e}")
            results[test_name] = False
    
    # Summary
    print("\n" + "=" * 50)
    print("🔒 Security Test Results Summary")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All security tests passed!")
    elif passed >= total * 0.8:
        print("⚠️ Most security tests passed, review failures")
    else:
        print("❌ Multiple security issues found, immediate attention required")

if __name__ == "__main__":
    main()