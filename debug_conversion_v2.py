#!/usr/bin/env python3
import requests
import json
import time

# Test single conversion with better error handling
print("=== Debug Single Conversion v2 ===")

# 1. Upload file
print("1. Uploading test file...")
try:
    with open('test_document.txt', 'rb') as f:
        files = {'file': f}
        data = {'sessionId': 'debug_session'}
        response = requests.post('http://localhost:5002/api/upload', files=files, data=data)

    print(f"Upload status: {response.status_code}")
    print(f"Upload headers: {dict(response.headers)}")
    print(f"Upload response text: {response.text}")
    
    if response.status_code == 429:
        print("Rate limited! Waiting 5 seconds...")
        time.sleep(5)
        # Retry
        with open('test_document.txt', 'rb') as f:
            files = {'file': f}
            data = {'sessionId': 'debug_session_retry'}
            response = requests.post('http://localhost:5002/api/upload', files=files, data=data)
        print(f"Retry upload status: {response.status_code}")
        print(f"Retry upload response text: {response.text}")
    
    if response.status_code == 200:
        upload_data = response.json()
        print(f"Upload response: {json.dumps(upload_data, indent=2)}")
        
        if 'fileId' in upload_data:
            file_id = upload_data['fileId']
            print(f"File ID: {file_id}")
            
            # 2. Test conversion
            print("\n2. Testing conversion...")
            conversion_payload = {
                'fileId': file_id,
                'outputFormat': 'docx',
                'sessionId': 'debug_session'
            }
            
            response = requests.post('http://localhost:5002/api/convert', 
                                   json=conversion_payload,
                                   headers={'Content-Type': 'application/json'})
            
            print(f"Conversion status: {response.status_code}")
            print(f"Conversion response text: {response.text}")
            
            if response.status_code == 200:
                conversion_data = response.json()
                print(f"Conversion response: {json.dumps(conversion_data, indent=2)}")
        else:
            print("No fileId in upload response")
    else:
        print(f"Upload failed with status {response.status_code}")
        
except Exception as e:
    print(f"Error: {e}")
