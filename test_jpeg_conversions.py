#!/usr/bin/env python3
"""
Test script to identify JPEG conversion issues and test all image format combinations.
"""

import os
import sys
import logging
from pathlib import Path
from PIL import Image
import requests
import json

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Test server URL
BASE_URL = "http://localhost:5002"

def create_test_images():
    """Create test images in various formats for testing."""
    test_dir = Path("test_images")
    test_dir.mkdir(exist_ok=True)
    
    # Create a simple test image
    img = Image.new('RGB', (100, 100), color='red')
    
    # Save in different formats
    formats = {
        'test.jpg': 'JPEG',
        'test.png': 'PNG',
        'test.bmp': 'BMP',
        'test.gif': 'GIF',
        'test.tiff': 'TIFF',
        'test.webp': 'WEBP'
    }
    
    for filename, format_name in formats.items():
        filepath = test_dir / filename
        try:
            if format_name == 'JPEG':
                img.save(filepath, format=format_name, quality=85)
            else:
                img.save(filepath, format=format_name)
            logger.info(f"Created test image: {filepath}")
        except Exception as e:
            logger.error(f"Failed to create {filepath}: {e}")
    
    # Create an image with transparency for testing
    img_rgba = Image.new('RGBA', (100, 100), color=(255, 0, 0, 128))
    try:
        img_rgba.save(test_dir / 'test_transparent.png', format='PNG')
        logger.info(f"Created transparent test image: {test_dir / 'test_transparent.png'}")
    except Exception as e:
        logger.error(f"Failed to create transparent image: {e}")

def test_conversion(input_file, output_format):
    """Test a specific conversion combination."""
    try:
        # Upload file
        with open(input_file, 'rb') as f:
            files = {'file': f}
            upload_response = requests.post(f"{BASE_URL}/api/upload", files=files)
        
        if upload_response.status_code != 200:
            logger.error(f"Upload failed for {input_file}: {upload_response.text}")
            return False
        
        upload_data = upload_response.json()
        session_id = upload_data.get('sessionId')
        
        # Convert file
        convert_data = {
            'sessionId': session_id,
            'outputFormat': output_format
        }
        
        convert_response = requests.post(f"{BASE_URL}/api/convert", json=convert_data)
        
        if convert_response.status_code == 200:
            logger.info(f"✅ SUCCESS: {input_file.name} → {output_format}")
            return True
        else:
            logger.error(f"❌ FAILED: {input_file.name} → {output_format}: {convert_response.text}")
            return False
            
    except Exception as e:
        logger.error(f"❌ ERROR: {input_file.name} → {output_format}: {str(e)}")
        return False

def test_all_combinations():
    """Test all image format conversion combinations."""
    test_dir = Path("test_images")
    
    if not test_dir.exists():
        logger.error("Test images directory not found. Run create_test_images() first.")
        return
    
    # Input formats to test
    input_files = [
        test_dir / 'test.jpg',
        test_dir / 'test.png', 
        test_dir / 'test.bmp',
        test_dir / 'test.gif',
        test_dir / 'test.tiff',
        test_dir / 'test.webp',
        test_dir / 'test_transparent.png'
    ]
    
    # Output formats to test
    output_formats = ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'tiff', 'webp', 'pdf']
    
    results = {}
    total_tests = 0
    successful_tests = 0
    
    logger.info("Starting comprehensive image conversion tests...")
    logger.info("=" * 60)
    
    for input_file in input_files:
        if not input_file.exists():
            logger.warning(f"Skipping {input_file.name} - file not found")
            continue
            
        input_format = input_file.suffix[1:].lower()
        results[input_format] = {}
        
        for output_format in output_formats:
            # Skip same format conversions
            if input_format == output_format or (input_format == 'jpg' and output_format == 'jpeg') or (input_format == 'jpeg' and output_format == 'jpg'):
                continue
                
            total_tests += 1
            success = test_conversion(input_file, output_format)
            results[input_format][output_format] = success
            
            if success:
                successful_tests += 1
    
    # Print summary
    logger.info("=" * 60)
    logger.info(f"CONVERSION TEST SUMMARY")
    logger.info(f"Total tests: {total_tests}")
    logger.info(f"Successful: {successful_tests}")
    logger.info(f"Failed: {total_tests - successful_tests}")
    logger.info(f"Success rate: {(successful_tests/total_tests)*100:.1f}%")
    
    # Print detailed results
    logger.info("\nDETAILED RESULTS:")
    for input_format, conversions in results.items():
        failed_conversions = [output for output, success in conversions.items() if not success]
        if failed_conversions:
            logger.error(f"{input_format.upper()} FAILURES: {', '.join(failed_conversions)}")
        else:
            logger.info(f"{input_format.upper()}: All conversions successful")

def main():
    """Main test function."""
    if len(sys.argv) > 1 and sys.argv[1] == "create":
        logger.info("Creating test images...")
        create_test_images()
    else:
        logger.info("Testing all conversion combinations...")
        test_all_combinations()

if __name__ == "__main__":
    main()