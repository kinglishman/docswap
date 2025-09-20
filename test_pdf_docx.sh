#!/bin/bash

# Upload PDF file (session will be created automatically)
UPLOAD_RESPONSE=$(curl -s -X POST \
  -F "file=@uploads/314d7c8a_ATT PROFILE.pdf" \
  http://localhost:5002/api/upload)

echo "Upload response: $UPLOAD_RESPONSE"

# Extract file ID and actual session ID
FILE_ID=$(echo "$UPLOAD_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['fileId'])")
ACTUAL_SESSION_ID=$(echo "$UPLOAD_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['sessionId'])")

echo "File ID: $FILE_ID"
echo "Actual Session ID: $ACTUAL_SESSION_ID"

# Test PDF to DOCX conversion
echo "Testing PDF to DOCX conversion..."
CONVERT_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"fileId\":\"$FILE_ID\",\"sessionId\":\"$ACTUAL_SESSION_ID\",\"outputFormat\":\"docx\"}" \
  http://localhost:5002/api/convert)

echo "Convert response: $CONVERT_RESPONSE"