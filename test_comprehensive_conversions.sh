#!/bin/bash

# Comprehensive conversion testing script
echo "=== DOCSWAP Comprehensive Conversion Testing ==="
echo "Testing all major conversion combinations..."
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to test conversion
test_conversion() {
    local input_file="$1"
    local output_format="$2"
    local test_name="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing $test_name... "
    
    # Create test payload
    local session_id="test_session_$(date +%s)"
    local file_id="test_file_$(date +%s)"
    
    # Upload file first
    upload_response=$(curl -s -X POST \
        -F "file=@$input_file" \
        -F "sessionId=$session_id" \
        http://localhost:5002/api/upload)
    
    # Extract file ID from upload response
    file_id=$(echo "$upload_response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('fileId', ''))
except:
    print('')
")
    
    if [ -z "$file_id" ]; then
        echo -e "${RED}FAILED${NC} (Upload failed)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
    
    # Test conversion
    conversion_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"fileId\":\"$file_id\",\"outputFormat\":\"$output_format\",\"sessionId\":\"$session_id\"}" \
        http://localhost:5002/api/convert)
    
    # Check if conversion was successful
    success=$(echo "$conversion_response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('true' if data.get('success', False) else 'false')
except:
    print('false')
")
    
    if [ "$success" = "true" ]; then
        echo -e "${GREEN}PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}FAILED${NC}"
        echo "  Error: $(echo "$conversion_response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('error', 'Unknown error'))
except:
    print('Parse error')
")"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Create test files if they don't exist
echo "Preparing test files..."

# Create a simple text file
echo "This is a test document for conversion testing." > test_document.txt

# Create a simple HTML file
cat > test_document.html << 'HTML_EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Test Document</title>
</head>
<body>
    <h1>Test Document</h1>
    <p>This is a test document for conversion testing.</p>
    <p>It contains some <strong>bold text</strong> and <em>italic text</em>.</p>
</body>
</html>
HTML_EOF

# Create a simple CSV file
cat > test_document.csv << 'CSV_EOF'
Name,Age,City
John Doe,30,New York
Jane Smith,25,Los Angeles
Bob Johnson,35,Chicago
CSV_EOF

echo "Test files created."
echo

# Test major conversion combinations
echo "=== Starting Conversion Tests ==="
echo

# Text to other formats
if [ -f "test_document.txt" ]; then
    test_conversion "test_document.txt" "docx" "TXT → DOCX"
    test_conversion "test_document.txt" "pdf" "TXT → PDF"
    test_conversion "test_document.txt" "html" "TXT → HTML"
fi

# HTML to other formats
if [ -f "test_document.html" ]; then
    test_conversion "test_document.html" "docx" "HTML → DOCX"
    test_conversion "test_document.html" "pdf" "HTML → PDF"
    test_conversion "test_document.html" "txt" "HTML → TXT"
fi

# CSV to other formats
if [ -f "test_document.csv" ]; then
    test_conversion "test_document.csv" "xlsx" "CSV → XLSX"
    test_conversion "test_document.csv" "pdf" "CSV → PDF"
    test_conversion "test_document.csv" "html" "CSV → HTML"
fi

# Test with existing PDF if available
if [ -f "sample.pdf" ]; then
    test_conversion "sample.pdf" "docx" "PDF → DOCX (existing file)"
    test_conversion "sample.pdf" "txt" "PDF → TXT (existing file)"
    test_conversion "sample.pdf" "html" "PDF → HTML (existing file)"
fi

echo
echo "=== Test Results Summary ==="
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}All tests passed! 🎉${NC}"
    exit 0
else
    echo -e "${YELLOW}Some tests failed. Check the output above for details.${NC}"
    exit 1
fi
