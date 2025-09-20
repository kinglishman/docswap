#!/usr/bin/env python3
import requests
import json

# Test single conversion
print("=== Debug Single Conversion ===")

# 1. Upload file
print("1. Uploading test file...")
with open('test_document.txt', 'rb') as f:
    files = {'file': f}
    data = {'sessionId': 'debug_session'}
    response = requests.post('http://localhost:5002/api/upload', files=files, data=data)

print(f"Upload status: {response.status_code}")
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
    conversion_data = response.json()
    print(f"Conversion response: {json.dumps(conversion_data, indent=2)}")
else:
    print("Upload failed, cannot test conversion")
