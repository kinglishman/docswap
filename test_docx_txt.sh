#!/bin/bash

echo "Testing DOCX to TXT conversion..."

# Upload DOCX file
UPLOAD_RESPONSE=$(curl -s -X POST \
  -F "file=@output/test_sample-854d6b10.docx" \
  http://localhost:5002/api/upload)

echo "Upload response: $UPLOAD_RESPONSE"

# Extract file ID and session ID
FILE_ID=$(echo "$UPLOAD_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['fileId'])")
SESSION_ID=$(echo "$UPLOAD_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['sessionId'])")

echo "File ID: $FILE_ID"
echo "Session ID: $SESSION_ID"

# Test DOCX to TXT conversion
echo "Converting DOCX to TXT..."
CONVERT_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"fileId\":\"$FILE_ID\",\"sessionId\":\"$SESSION_ID\",\"outputFormat\":\"txt\"}" \
  http://localhost:5002/api/convert)

echo "Convert response: $CONVERT_RESPONSE"