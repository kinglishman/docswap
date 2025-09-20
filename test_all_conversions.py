#!/usr/bin/env python3
import requests
import json
import time
import os

def test_conversion(input_file, output_format, session_id="test_session"):
    """Test a single conversion"""
    print(f"\n=== Testing {input_file} → {output_format} ===")
    
    # Upload file
    try:
        with open(input_file, 'rb') as f:
            files = {'file': f}
            data = {'sessionId': session_id}
            response = requests.post('http://localhost:5002/api/upload', files=files, data=data)
        
        if response.status_code == 429:
            print("Rate limited, waiting 2 seconds...")
            time.sleep(2)
            with open(input_file, 'rb') as f:
                files = {'file': f}
                data = {'sessionId': session_id + "_retry"}
                response = requests.post('http://localhost:5002/api/upload', files=files, data=data)
        
        if response.status_code != 200:
            print(f"❌ Upload failed: {response.status_code} - {response.text}")
            return False
        
        upload_data = response.json()
        file_id = upload_data['fileId']
        print(f"✅ Upload successful: {file_id}")
        
        # Convert file
        conversion_payload = {
            'fileId': file_id,
            'outputFormat': output_format,
            'sessionId': session_id
        }
        
        response = requests.post('http://localhost:5002/api/convert', 
                               json=conversion_payload,
                               headers={'Content-Type': 'application/json'})
        
        if response.status_code != 200:
            print(f"❌ Conversion failed: {response.status_code} - {response.text}")
            return False
        
        conversion_data = response.json()
        print(f"✅ Conversion successful: {conversion_data['name']} ({conversion_data['size']} bytes)")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("=== Comprehensive Conversion Testing ===")
    
    # Test combinations
    test_cases = [
        ('test_document.txt', 'docx'),
        ('test_document.txt', 'pdf'),
        ('test_document.html', 'pdf'),
        ('test_document.html', 'docx'),
        ('test_document.csv', 'xlsx'),
        ('test_sample.csv', 'txt'),
    ]
    
    results = []
    
    for input_file, output_format in test_cases:
        if os.path.exists(input_file):
            success = test_conversion(input_file, output_format)
            results.append((f"{input_file} → {output_format}", success))
            time.sleep(1)  # Rate limiting prevention
        else:
            print(f"⚠️  File {input_file} not found, skipping")
            results.append((f"{input_file} → {output_format}", False))
    
    # Summary
    print("\n" + "="*50)
    print("CONVERSION TEST SUMMARY")
    print("="*50)
    
    passed = 0
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if success:
            passed += 1
    
    print(f"\nResults: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All conversions working perfectly!")
    elif passed > 0:
        print("⚠️  Some conversions working, check failed ones")
    else:
        print("❌ No conversions working, check server")

if __name__ == "__main__":
    main()
