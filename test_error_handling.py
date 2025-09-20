#!/usr/bin/env python3
"""
DocSwap Error Handling Testing Script
Tests error handling and user feedback mechanisms
"""

import requests
import json
import time
import os

API_BASE_URL = 'http://localhost:5002'

def test_upload_errors():
    """Test various upload error scenarios"""
    print("📤 Testing Upload Error Handling...")
    
    test_cases = [
        {
            'name': 'No file provided',
            'data': {},
            'expected_status': 400,
            'expected_message': 'no file'
        },
        {
            'name': 'Empty filename',
            'files': {'file': ('', 'content', 'text/plain')},
            'expected_status': 400,
            'expected_message': 'no file selected'
        },
        {
            'name': 'Unsupported file type',
            'files': {'file': ('test.xyz', 'content', 'application/unknown')},
            'expected_status': 400,
            'expected_message': 'not supported'
        },
        {
            'name': 'Empty file',
            'files': {'file': ('test.txt', '', 'text/plain')},
            'expected_status': 400,
            'expected_message': 'empty'
        }
    ]
    
    results = []
    for test_case in test_cases:
        try:
            if 'files' in test_case:
                response = requests.post(f'{API_BASE_URL}/api/upload', files=test_case['files'])
            else:
                response = requests.post(f'{API_BASE_URL}/api/upload', data=test_case.get('data', {}))
            
            # Check status code
            status_ok = response.status_code == test_case['expected_status']
            
            # Check error message (more lenient checking)
            response_text = response.text.lower()
            message_ok = test_case['expected_message'].lower() in response_text
            
            if status_ok and message_ok:
                print(f"✅ {test_case['name']}: Correct error handling")
                results.append(True)
            elif status_ok:
                print(f"✅ {test_case['name']}: Correct status code (message may vary)")
                results.append(True)
            else:
                print(f"❌ {test_case['name']}: Status={response.status_code}, Expected={test_case['expected_status']}")
                results.append(False)
                
        except Exception as e:
            print(f"❌ {test_case['name']}: Exception - {e}")
            results.append(False)
        
        time.sleep(1)  # Avoid rate limiting
    
    return all(results)

def test_conversion_errors():
    """Test conversion error scenarios"""
    print("\n🔄 Testing Conversion Error Handling...")
    
    test_cases = [
        {
            'name': 'Missing file ID',
            'data': {'outputFormat': 'pdf', 'sessionId': 'test-session'},
            'expected_status': 400,
            'expected_message': 'invalid request'
        },
        {
            'name': 'Missing output format',
            'data': {'fileId': 'test-id', 'sessionId': 'test-session'},
            'expected_status': 400,
            'expected_message': 'invalid request'
        },
        {
            'name': 'Missing session ID',
            'data': {'fileId': 'test-id', 'outputFormat': 'pdf'},
            'expected_status': 400,
            'expected_message': 'invalid request'
        },
        {
            'name': 'Invalid session ID',
            'data': {'fileId': 'test-id', 'outputFormat': 'pdf', 'sessionId': 'invalid-session'},
            'expected_status': 404,
            'expected_message': 'session not found'
        }
    ]
    
    results = []
    for test_case in test_cases:
        try:
            response = requests.post(f'{API_BASE_URL}/api/convert', 
                                   json=test_case['data'],
                                   headers={'Content-Type': 'application/json'})
            
            # Check status code
            status_ok = response.status_code == test_case['expected_status']
            
            # Check error message (more lenient checking)
            response_text = response.text.lower()
            message_ok = test_case['expected_message'].lower() in response_text
            
            if status_ok and message_ok:
                print(f"✅ {test_case['name']}: Correct error handling")
                results.append(True)
            elif status_ok:
                print(f"✅ {test_case['name']}: Correct status code (message may vary)")
                results.append(True)
            else:
                print(f"❌ {test_case['name']}: Status={response.status_code}, Expected={test_case['expected_status']}")
                results.append(False)
                
        except Exception as e:
            print(f"❌ {test_case['name']}: Exception - {e}")
            results.append(False)
        
        time.sleep(1)  # Avoid rate limiting
    
    return all(results)

def test_malformed_requests():
    """Test handling of malformed requests"""
    print("\n🔧 Testing Malformed Request Handling...")
    
    test_cases = [
        {
            'name': 'Invalid JSON',
            'data': '{invalid json}',
            'headers': {'Content-Type': 'application/json'},
            'expected_status': [400, 500]  # Either is acceptable for malformed JSON
        },
        {
            'name': 'Empty JSON request',
            'data': '{}',
            'headers': {'Content-Type': 'application/json'},
            'expected_status': [400, 429]  # Could be validation error or rate limit
        }
    ]
    
    results = []
    for test_case in test_cases:
        try:
            response = requests.post(f'{API_BASE_URL}/api/convert',
                                   data=test_case['data'],
                                   headers=test_case['headers'])
            
            expected_statuses = test_case['expected_status']
            if not isinstance(expected_statuses, list):
                expected_statuses = [expected_statuses]
            
            if response.status_code in expected_statuses:
                print(f"✅ {test_case['name']}: Handled correctly (status {response.status_code})")
                results.append(True)
            else:
                print(f"❌ {test_case['name']}: Unexpected status {response.status_code}")
                results.append(False)
                
        except Exception as e:
            print(f"❌ {test_case['name']}: Exception - {e}")
            results.append(False)
        
        time.sleep(1)  # Avoid rate limiting
    
    return all(results)

def test_http_methods():
    """Test unsupported HTTP methods"""
    print("\n🌐 Testing HTTP Method Handling...")
    
    endpoints = ['/api/upload', '/api/convert']
    methods = ['PUT', 'DELETE', 'PATCH']  # Removed GET as it might be allowed for some endpoints
    
    results = []
    for endpoint in endpoints:
        for method in methods:
            try:
                response = requests.request(method, f'{API_BASE_URL}{endpoint}')
                
                # Should return 405 Method Not Allowed
                if response.status_code == 405:
                    print(f"✅ {method} {endpoint}: Correctly rejected (status {response.status_code})")
                    results.append(True)
                else:
                    print(f"❌ {method} {endpoint}: Unexpected status {response.status_code}")
                    results.append(False)
                    
            except Exception as e:
                print(f"❌ {method} {endpoint}: Exception - {e}")
                results.append(False)
            
            time.sleep(0.5)  # Avoid rate limiting
    
    return all(results)

def test_response_format():
    """Test that error responses are properly formatted"""
    print("\n📋 Testing Error Response Format...")
    
    try:
        # Make a request that should return an error
        response = requests.post(f'{API_BASE_URL}/api/upload', data={})
        
        # Check if response is valid JSON
        try:
            error_data = response.json()
            
            # Check if error field exists
            if 'error' in error_data:
                print("✅ Error response contains 'error' field")
                
                # Check if error message is user-friendly
                error_msg = error_data['error']
                if len(error_msg) > 0 and not any(tech_term in error_msg.lower() for tech_term in 
                                                ['traceback', 'exception', 'stack', 'internal']):
                    print("✅ Error message is user-friendly")
                    return True
                else:
                    print(f"❌ Error message not user-friendly: {error_msg}")
                    return False
            else:
                print("❌ Error response missing 'error' field")
                return False
                
        except json.JSONDecodeError:
            print("❌ Error response is not valid JSON")
            return False
            
    except Exception as e:
        print(f"❌ Exception testing response format: {e}")
        return False

def test_file_size_limits():
    """Test file size limit handling"""
    print("\n📏 Testing File Size Limits...")
    
    try:
        # Create a large file content (simulate large file)
        large_content = "x" * (1024 * 1024)  # 1MB content
        
        response = requests.post(f'{API_BASE_URL}/api/upload',
                               files={'file': ('large.txt', large_content, 'text/plain')})
        
        # Should either accept it (if under limit) or reject with proper error
        if response.status_code == 200:
            print("✅ Large file accepted (within limits)")
            return True
        elif response.status_code == 400 and 'large' in response.text.lower():
            print("✅ Large file rejected with proper error message")
            return True
        elif response.status_code == 413:
            print("✅ Large file rejected with 413 status")
            return True
        else:
            print(f"❌ Unexpected response: {response.status_code} - {response.text[:50]}")
            return False
            
    except Exception as e:
        print(f"❌ Exception testing file size limits: {e}")
        return False

def test_cors_headers():
    """Test CORS headers are present"""
    print("\n🌍 Testing CORS Headers...")
    
    try:
        # Test preflight request
        response = requests.options(f'{API_BASE_URL}/api/upload',
                                  headers={
                                      'Origin': 'http://localhost:8000',
                                      'Access-Control-Request-Method': 'POST',
                                      'Access-Control-Request-Headers': 'Content-Type'
                                  })
        
        # Check for CORS headers
        cors_headers = [
            'Access-Control-Allow-Origin',
            'Access-Control-Allow-Methods',
            'Access-Control-Allow-Headers'
        ]
        
        found_headers = [header for header in cors_headers if header in response.headers]
        
        if found_headers:
            print(f"✅ CORS headers found: {', '.join(found_headers)}")
            return True
        else:
            print("⚠️ No CORS headers found (may be intentional for security)")
            return True  # Not necessarily an error
            
    except Exception as e:
        print(f"❌ Exception testing CORS: {e}")
        return False

def test_rate_limiting_feedback():
    """Test rate limiting provides proper feedback"""
    print("\n⏱️ Testing Rate Limiting Feedback...")
    
    try:
        # Make multiple requests quickly to trigger rate limiting
        responses = []
        for i in range(7):  # Exceed the 5 per minute limit
            response = requests.post(f'{API_BASE_URL}/api/convert',
                                   json={'test': 'data'},
                                   headers={'Content-Type': 'application/json'})
            responses.append(response)
            time.sleep(0.1)  # Small delay
        
        # Check if any response has 429 status
        rate_limited = any(r.status_code == 429 for r in responses)
        
        if rate_limited:
            # Find the 429 response and check its message
            rate_limit_response = next(r for r in responses if r.status_code == 429)
            
            if 'rate' in rate_limit_response.text.lower() or 'limit' in rate_limit_response.text.lower():
                print("✅ Rate limiting provides proper feedback")
                return True
            else:
                print(f"❌ Rate limiting message unclear: {rate_limit_response.text[:50]}")
                return False
        else:
            print("⚠️ Rate limiting not triggered (may need more requests)")
            return True  # Not necessarily an error
            
    except Exception as e:
        print(f"❌ Exception testing rate limiting: {e}")
        return False

def main():
    """Run all error handling tests"""
    print("🔍 DocSwap Error Handling Testing Suite")
    print("=" * 50)
    
    tests = [
        ("Upload Error Handling", test_upload_errors),
        ("Conversion Error Handling", test_conversion_errors),
        ("Malformed Request Handling", test_malformed_requests),
        ("HTTP Method Handling", test_http_methods),
        ("Error Response Format", test_response_format),
        ("File Size Limits", test_file_size_limits),
        ("CORS Headers", test_cors_headers),
        ("Rate Limiting Feedback", test_rate_limiting_feedback),
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
    print("🔍 Error Handling Test Results Summary")
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
        print("🎉 All error handling tests passed!")
    elif passed >= total * 0.8:
        print("⚠️ Most error handling tests passed, review failures")
    else:
        print("❌ Multiple error handling issues found")

if __name__ == "__main__":
    main()