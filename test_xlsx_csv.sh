#!/bin/bash

echo "Testing XLSX to CSV conversion..."

# Upload XLSX file
UPLOAD_RESPONSE=$(curl -s -X POST \
  -F "file=@output/test_sample-2dc8e727.xlsx" \
  http://localhost:5002/api/upload)

echo "Upload response: $UPLOAD_RESPONSE"

# Extract file ID and session ID
FILE_ID=$(echo "$UPLOAD_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['fileId'])")
SESSION_ID=$(echo "$UPLOAD_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['sessionId'])")

echo "File ID: $FILE_ID"
echo "Session ID: $SESSION_ID"

# Test XLSX to CSV conversion
echo "Converting XLSX to CSV..."
CONVERT_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"fileId\":\"$FILE_ID\",\"sessionId\":\"$SESSION_ID\",\"outputFormat\":\"csv\"}" \
  http://localhost:5002/api/convert)

echo "Convert response: $CONVERT_RESPONSE"