#!/bin/bash

# Production API Test Script for mydocswap.com
echo "Testing DocSwap Production API..."

# Step 1: Test capabilities endpoint
echo "1. Testing capabilities endpoint..."
curl -s https://mydocswap.com/api/capabilities | jq .

# Step 2: Upload a test file
echo -e "\n2. Uploading test file..."
UPLOAD_RESPONSE=$(curl -s -X POST -F "file=@test.txt" -F "outputFormat=pdf" https://mydocswap.com/api/upload/public)
echo $UPLOAD_RESPONSE | jq .

# Extract session ID and file ID
SESSION_ID=$(echo $UPLOAD_RESPONSE | jq -r '.sessionId')
FILE_ID=$(echo $UPLOAD_RESPONSE | jq -r '.fileId')

echo "Session ID: $SESSION_ID"
echo "File ID: $FILE_ID"

# Step 3: Convert the file
echo -e "\n3. Converting file to PDF..."
CONVERT_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"fileId\":\"$FILE_ID\",\"sessionId\":\"$SESSION_ID\",\"outputFormat\":\"pdf\"}" \
  https://mydocswap.com/api/convert/public)
echo $CONVERT_RESPONSE | jq .

# Extract download URL
DOWNLOAD_URL=$(echo $CONVERT_RESPONSE | jq -r '.downloadUrl')
echo "Download URL: $DOWNLOAD_URL"

# Step 4: Test download (headers only)
echo -e "\n4. Testing download endpoint..."
curl -I "https://mydocswap.com$DOWNLOAD_URL"

echo -e "\n✅ Production API test complete!"