#!/usr/bin/env python3
"""
Test script to verify the updated conversion functions work correctly.
"""

import requests
import json
import time
import os

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_SESSION_ID = "test-session-123"

def test_health():
    """Test if the server is healthy."""
    print("Testing server health...")
    response = requests.get(f"{BASE_URL}/health")
    if response.status_code == 200:
        print("✅ Server is healthy")
        return True
    else:
        print(f"❌ Server health check failed: {response.status_code}")
        return False

def test_upload_and_convert():
    """Test file upload and conversion."""
    print("\nTesting file upload and conversion...")
    
    # Create a simple test file (we'll use a text file for simplicity)
    test_content = "This is a test document for conversion testing.\n\nIt contains multiple lines to verify the conversion works properly."
    test_file_path = "/tmp/test_document.txt"
    
    with open(test_file_path, 'w') as f:
        f.write(test_content)
    
    try:
        # Upload the file
        print("Uploading test file...")
        with open(test_file_path, 'rb') as f:
            files = {'file': ('test_document.txt', f, 'text/plain')}
            data = {'sessionId': TEST_SESSION_ID}
            
            response = requests.post(f"{BASE_URL}/api/upload/public", files=files, data=data)
        
        if response.status_code != 200:
            print(f"❌ Upload failed: {response.status_code} - {response.text}")
            return False
        
        upload_result = response.json()
        file_id = upload_result.get('fileId')
        print(f"✅ File uploaded successfully. File ID: {file_id}")
        
        # Test conversion (text to PDF)
        print("Testing conversion...")
        conversion_data = {
            'fileId': file_id,
            'outputFormat': 'pdf',
            'sessionId': TEST_SESSION_ID
        }
        
        response = requests.post(f"{BASE_URL}/api/convert/public", 
                               json=conversion_data,
                               headers={'Content-Type': 'application/json'})
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Conversion successful: {result}")
            return True
        else:
            print(f"❌ Conversion failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        return False
    finally:
        # Clean up
        if os.path.exists(test_file_path):
            os.remove(test_file_path)

def main():
    """Run all tests."""
    print("Starting conversion function tests...\n")
    
    # Test server health
    if not test_health():
        return
    
    # Test upload and conversion
    test_upload_and_convert()
    
    print("\nTest completed!")

if __name__ == "__main__":
    main()