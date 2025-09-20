#!/bin/bash

echo "Testing CSV to XLSX conversion..."

# Upload CSV file
UPLOAD_RESPONSE=$(curl -s -X POST \
  -F "file=@test_sample.csv" \
  http://localhost:5002/api/upload)

echo "Upload response: $UPLOAD_RESPONSE"

# Extract file ID and session ID
FILE_ID=$(echo "$UPLOAD_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['fileId'])")
SESSION_ID=$(echo "$UPLOAD_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['sessionId'])")

echo "File ID: $FILE_ID"
echo "Session ID: $SESSION_ID"

# Test CSV to XLSX conversion
echo "Converting CSV to XLSX..."
CONVERT_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"fileId\":\"$FILE_ID\",\"sessionId\":\"$SESSION_ID\",\"outputFormat\":\"xlsx\"}" \
  http://localhost:5002/api/convert)

echo "Convert response: $CONVERT_RESPONSE"