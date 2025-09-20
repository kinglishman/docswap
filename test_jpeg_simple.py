#!/usr/bin/env python3
"""
Simple JPEG conversion test script that properly uploads files and uses fileId for conversion.
"""

import requests
import time
import json
import os

BASE_URL = "http://localhost:5002"

def upload_file(file_path):
    """Upload a file and return the fileId and sessionId"""
    try:
        with open(file_path, 'rb') as f:
            files = {'file': f}
            response = requests.post(f"{BASE_URL}/api/upload", files=files)
            
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Uploaded {file_path}: fileId={data['fileId']}, sessionId={data['sessionId']}")
            return data['fileId'], data['sessionId']
        else:
            print(f"✗ Upload failed for {file_path}: {response.status_code} - {response.text}")
            return None, None
    except Exception as e:
        print(f"✗ Upload error for {file_path}: {str(e)}")
        return None, None

def convert_file(file_id, session_id, output_format):
    """Convert a file using fileId and sessionId"""
    try:
        data = {
            'fileId': file_id,
            'sessionId': session_id,
            'outputFormat': output_format
        }
        
        response = requests.post(f"{BASE_URL}/api/convert", json=data)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Conversion successful: {output_format}")
            return True
        else:
            print(f"✗ Conversion failed to {output_format}: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"✗ Conversion error to {output_format}: {str(e)}")
        return False

def test_jpeg_conversions():
    """Test JPEG conversions with proper upload and conversion flow"""
    test_files = [
        ('test_images/test.jpg', 'JPG'),
        ('test_images/test.png', 'PNG'),
        ('test_images/test.bmp', 'BMP'),
        ('test_images/test.gif', 'GIF'),
        ('test_images/test.tiff', 'TIFF'),
        ('test_images/test.webp', 'WebP'),
        ('test_images/test_transparent.png', 'Transparent PNG')
    ]
    
    # Test conversions to JPEG
    print("=== Testing conversions TO JPEG ===")
    for file_path, file_type in test_files:
        if not os.path.exists(file_path):
            print(f"⚠ Skipping {file_type}: {file_path} not found")
            continue
            
        print(f"\nTesting {file_type} → JPEG:")
        
        # Upload file
        file_id, session_id = upload_file(file_path)
        if not file_id:
            continue
            
        # Convert to JPEG
        convert_file(file_id, session_id, 'jpg')
        
        # Wait to avoid rate limiting
        time.sleep(2)
    
    # Test conversions FROM JPEG
    print("\n=== Testing conversions FROM JPEG ===")
    jpeg_file = 'test_images/test.jpg'
    if os.path.exists(jpeg_file):
        output_formats = ['pdf', 'png', 'bmp', 'gif', 'tiff', 'webp']
        
        for output_format in output_formats:
            print(f"\nTesting JPEG → {output_format.upper()}:")
            
            # Upload JPEG file
            file_id, session_id = upload_file(jpeg_file)
            if not file_id:
                continue
                
            # Convert to target format
            convert_file(file_id, session_id, output_format)
            
            # Wait to avoid rate limiting
            time.sleep(2)
    else:
        print(f"⚠ JPEG test file not found: {jpeg_file}")

if __name__ == "__main__":
    print("Starting JPEG conversion tests...")
    test_jpeg_conversions()
    print("\nTest completed!")