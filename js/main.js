/* DocSwap - Main JavaScript */

// Global variables
let currentFile = null;
let convertedFileUrl = null;
let sessionId = null;
let authToken = null;

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the application
    initApp();
    
    // Professional page state management
    setupPageStateManagement();
});

// Initialize the application
function initApp() {
    // Always start at the top of the page for professional UX
    resetPageToHome();
    
    // Check for existing session
    checkExistingSession();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize scroll optimizations
    initScrollOptimizations();
}

// Check if there's an existing session
function checkExistingSession() {
    // Get session ID from URL or sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const urlSessionId = urlParams.get('session');
    const storedSessionId = sessionStorage.getItem('docswap-session');
    
    if (urlSessionId) {
        // Session ID from URL takes precedence
        sessionId = urlSessionId;
        sessionStorage.setItem('docswap-session', sessionId);
        // TODO: Fetch session data from server
        // For demo, we'll just show a notification
        showNotification('Session restored from link');
    } else if (storedSessionId) {
        // Use stored session ID
        sessionId = storedSessionId;
        // TODO: Fetch session data from server
        // For demo, we'll just show a notification
        showWelcomeNotification('Welcome back! Session restored', 'success');
    } else {
        // Generate a new session ID
        sessionId = generateSessionId();
        sessionStorage.setItem('docswap-session', sessionId);
    }
}

// Generate a random session ID
function generateSessionId() {
    return 'docswap-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Reset the current session
async function resetSession() {
    if (!sessionId) {
        showNotification('No active session to reset', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/session/${sessionId}/reset`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification(`Session reset successfully. Removed ${result.filesRemoved} files.`, 'success');
            
            // Reset the page state
            resetPageToHome();
        } else {
            const error = await response.json();
            showNotification(`Failed to reset session: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('Error resetting session:', error);
        showNotification('Failed to reset session. Please refresh the page.', 'error');
    }
}

// Get authentication token for API requests
async function getAuthToken() {
    try {
        // If we already have a token, return it
        if (authToken) return authToken;
        
        // If Supabase is initialized, get the session
        if (window.supabase) {
            const { data, error } = await window.supabase.auth.getSession();
            if (error) throw error;
            
            if (data && data.session) {
                authToken = data.session.access_token;
                return authToken;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error getting auth token:', error.message);
        return null;
    }
}

// Add authentication token to API requests
function addAuthToRequest(options = {}) {
    const token = authToken;
    if (!token) return options;
    
    // Add Authorization header with token
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = `Bearer ${token}`;
    
    return options;
}

// Set up all event listeners
function setupEventListeners() {
    // File upload via button
    const fileInput = document.getElementById('file-input');
    const fileSelectBtn = document.getElementById('file-select-btn');
    
    if (fileSelectBtn && fileInput) {
        fileSelectBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Drag and drop
    const dropArea = document.getElementById('drop-area');
    if (dropArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.add('drag-over');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.remove('drag-over');
            }, false);
        });
        
        dropArea.addEventListener('drop', handleDrop, false);
    }
    
    // Advanced options toggle
    const advancedToggle = document.querySelector('.advanced-toggle');
    const advancedContent = document.querySelector('.advanced-content');
    
    if (advancedToggle && advancedContent) {
        advancedToggle.addEventListener('click', () => {
            advancedContent.classList.toggle('hidden');
            // Toggle the arrow icon
            const arrow = advancedToggle.querySelector('svg');
            if (arrow) {
                arrow.style.transform = advancedContent.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
            }
        });
    }
    
    // Convert button
    const convertBtn = document.getElementById('convert-btn');
    if (convertBtn) {
        convertBtn.addEventListener('click', handleConversion);
    }
    
    // Download button
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (convertedFileUrl) {
                // Add download=true parameter to force download instead of preview
                const downloadUrl = convertedFileUrl.includes('?') ? 
                    `${convertedFileUrl}&download=true` : 
                    `${convertedFileUrl}?download=true`;
                
                // Create a temporary anchor element to trigger download
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = getConvertedFileName();
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        });
    }
    
    // New conversion button
    const newConversionBtn = document.getElementById('new-conversion-btn');
    if (newConversionBtn) {
        newConversionBtn.addEventListener('click', resetConversion);
    }
    
    // Copy link button
    const copyLinkBtn = document.getElementById('copy-link-btn');
    const shareUrl = document.getElementById('share-url');
    
    if (copyLinkBtn && shareUrl) {
        copyLinkBtn.addEventListener('click', () => {
            shareUrl.select();
            document.execCommand('copy');
            showNotification(getTranslation('copied'));
        });
    }
    
    // Output format change listener
    const outputFormatSelect = document.getElementById('output-format');
    if (outputFormatSelect) {
        outputFormatSelect.addEventListener('change', (e) => {
            if (currentFile) {
                const inputFormat = currentFile.name.split('.').pop().toLowerCase();
                const outputFormat = e.target.value;
                updateAdvancedOptions(inputFormat, outputFormat);
            }
        });
    }
    

    
    // Notification close button
    const notificationClose = document.getElementById('notification-close');
    if (notificationClose) {
        notificationClose.addEventListener('click', () => {
            const notification = document.getElementById('notification');
            if (notification) {
                notification.classList.add('hidden');
            }
        });
    }
    
    // Modal close functionality
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalBackdrop = document.getElementById('conversion-modal');
    const modalContainer = document.querySelector('.modal-container');
    
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeConversionModal);
    }
    
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', (e) => {
            // Close modal if clicking on backdrop (not on modal content)
            if (e.target === modalBackdrop) {
                closeConversionModal();
            }
        });
    }
    
    // Modal download button
    const modalDownloadBtn = document.getElementById('modal-download-btn');
    if (modalDownloadBtn) {
        modalDownloadBtn.addEventListener('click', () => {
            if (convertedFileUrl) {
                // Add download=true parameter to force download instead of preview
                const downloadUrl = convertedFileUrl.includes('?') ? 
                    `${convertedFileUrl}&download=true` : 
                    `${convertedFileUrl}?download=true`;
                
                // Create a temporary anchor element to trigger download
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = getConvertedFileName();
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        });
    }
    
    // Modal new conversion button
    const modalNewConversionBtn = document.getElementById('modal-new-conversion-btn');
    if (modalNewConversionBtn) {
        modalNewConversionBtn.addEventListener('click', () => {
            closeConversionModal();
            resetConversion();
        });
    }
}

// Prevent default drag and drop behavior
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Handle file drop
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

// Handle file selection from input
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        // Handle single file
        handleFile(files[0]);
    }
}

// Process the selected file
function handleFile(file) {
    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
        showNotification(getTranslation('errorFileSize'), 'error');
        return;
    }
    
    // Store the current file
    currentFile = file;
    
    // Show upload loading circle
    showUploadLoading();
    
    // Update UI to show file info
    document.getElementById('file-name').textContent = file.name;
    document.getElementById('file-size').textContent = formatFileSize(file.size);
    
    // Modern UX: Keep upload container visible with elegant transition
    setTimeout(() => {
        hideUploadLoading();
        
        // Add success state to upload container instead of hiding it
        const uploadContainer = document.getElementById('upload-container');
        uploadContainer.classList.add('file-uploaded');
        
        // File uploaded successfully - no notification needed as UI already shows success state
        
        // Show file processing section smoothly without animations
        const fileProcessingSection = document.getElementById('file-processing');
        fileProcessingSection.classList.remove('hidden');
        
        // Smooth scroll to conversion options
        setTimeout(() => {
            scrollToConversionOptions();
        }, 300);
        
    }, 800);
    
    // Update conversion options based on file type
    updateConversionOptions(file);
    
    // Simulate AI suggestion
    simulateAiSuggestion(file);
}

// Update conversion options based on file type
function updateConversionOptions(file) {
    const fileName = file.name.toLowerCase();
    const outputFormat = document.getElementById('output-format');
    
    // Clear existing options
    outputFormat.innerHTML = '<option value="" disabled selected>' + getTranslation('selectOutputFormat') + '</option>';
    
    // Get file extension
    const fileExtension = fileName.split('.').pop();
    let formats = [];
    
    if (fileName.endsWith('.pdf')) {
        // PDF to other formats
        
        formats = [
            // Document formats
            { value: 'docx', label: 'Word Document (.docx)' },
            { value: 'odt', label: 'OpenDocument Text (.odt)' },
            { value: 'rtf', label: 'Rich Text Format (.rtf)' },
            { value: 'txt', label: 'Plain Text (.txt)' },
            { value: 'html', label: 'HTML Document (.html)' },
            // Image formats
            { value: 'jpg', label: 'JPEG Image (.jpg)' },
            { value: 'png', label: 'PNG Image (.png)' },
            { value: 'tiff', label: 'TIFF Image (.tiff)' },
            { value: 'bmp', label: 'BMP Image (.bmp)' },
            { value: 'webp', label: 'WebP Image (.webp)' }
        ];
    } else if (['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'tif', 'gif'].includes(fileExtension)) {
        // Image formats
        
        formats = [
            { value: 'pdf', label: 'PDF Document (.pdf)' },
            { value: 'jpg', label: 'JPEG Image (.jpg)' },
            { value: 'jpeg', label: 'JPEG Image (.jpeg)' },
            { value: 'png', label: 'PNG Image (.png)' },
            { value: 'webp', label: 'WebP Image (.webp)' },
            { value: 'bmp', label: 'BMP Image (.bmp)' },
            { value: 'tiff', label: 'TIFF Image (.tiff)' },
            { value: 'tif', label: 'TIF Image (.tif)' },
            { value: 'gif', label: 'GIF Image (.gif)' }
        ];
    } else if (['docx'].includes(fileExtension)) {
        // Word documents
        
        formats = [
            { value: 'pdf', label: 'PDF Document (.pdf)' },
            { value: 'odt', label: 'OpenDocument Text (.odt)' },
            { value: 'rtf', label: 'Rich Text Format (.rtf)' },
            { value: 'txt', label: 'Plain Text (.txt)' },
            { value: 'html', label: 'HTML Document (.html)' },
            { value: 'epub', label: 'EPUB eBook (.epub)' }
        ];
    } else if (['odt'].includes(fileExtension)) {
        // OpenDocument Text
        
        formats = [
            { value: 'pdf', label: 'PDF Document (.pdf)' },
            { value: 'docx', label: 'Word Document (.docx)' },
            { value: 'rtf', label: 'Rich Text Format (.rtf)' },
            { value: 'txt', label: 'Plain Text (.txt)' },
            { value: 'html', label: 'HTML Document (.html)' }
        ];
    } else if (['rtf'].includes(fileExtension)) {
        // Rich Text Format
        
        formats = [
            { value: 'pdf', label: 'PDF Document (.pdf)' },
            { value: 'docx', label: 'Word Document (.docx)' },
            { value: 'odt', label: 'OpenDocument Text (.odt)' },
            { value: 'txt', label: 'Plain Text (.txt)' },
            { value: 'html', label: 'HTML Document (.html)' }
        ];
    } else if (['txt'].includes(fileExtension)) {
        // Text files
        
        formats = [
            { value: 'pdf', label: 'PDF Document (.pdf)' },
            { value: 'docx', label: 'Word Document (.docx)' },
            { value: 'doc', label: 'Word 97-2003 (.doc)' },
            { value: 'odt', label: 'OpenDocument Text (.odt)' },
            { value: 'rtf', label: 'Rich Text Format (.rtf)' },
            { value: 'html', label: 'HTML Document (.html)' },
            { value: 'md', label: 'Markdown (.md)' }
        ];
    } else if (['html', 'htm'].includes(fileExtension)) {
        // HTML documents
        
        formats = [
            { value: 'pdf', label: 'PDF Document (.pdf)' },
            { value: 'docx', label: 'Word Document (.docx)' },
            { value: 'odt', label: 'OpenDocument Text (.odt)' },
            { value: 'rtf', label: 'Rich Text Format (.rtf)' },
            { value: 'txt', label: 'Plain Text (.txt)' },
            { value: 'md', label: 'Markdown (.md)' }
        ];
    } else if (['md', 'markdown'].includes(fileExtension)) {
        // Markdown documents
        
        formats = [
            { value: 'pdf', label: 'PDF Document (.pdf)' },
            { value: 'docx', label: 'Word Document (.docx)' },
            { value: 'odt', label: 'OpenDocument Text (.odt)' },
            { value: 'html', label: 'HTML Document (.html)' },
            { value: 'txt', label: 'Plain Text (.txt)' },
            { value: 'epub', label: 'EPUB eBook (.epub)' }
        ];
    } else if (['epub'].includes(fileExtension)) {
        // EPUB eBooks
        
        formats = [
            { value: 'pdf', label: 'PDF Document (.pdf)' },
            { value: 'docx', label: 'Word Document (.docx)' },
            { value: 'html', label: 'HTML Document (.html)' },
            { value: 'txt', label: 'Plain Text (.txt)' },
            { value: 'md', label: 'Markdown (.md)' }
        ];
    } else if (['csv'].includes(fileExtension)) {
        // CSV files
        
        formats = [
            { value: 'xlsx', label: 'Excel Spreadsheet (.xlsx)' },
            { value: 'xls', label: 'Excel 97-2003 (.xls)' },
            { value: 'ods', label: 'OpenDocument Spreadsheet (.ods)' },
            { value: 'pdf', label: 'PDF Document (.pdf)' },
            { value: 'html', label: 'HTML Table (.html)' },
            { value: 'json', label: 'JSON Data (.json)' }
        ];
    } else if (['xlsx', 'xls'].includes(fileExtension)) {
        // Excel files
        
        formats = [
            { value: 'csv', label: 'CSV File (.csv)' },
            { value: 'ods', label: 'OpenDocument Spreadsheet (.ods)' },
            { value: 'pdf', label: 'PDF Document (.pdf)' },
            { value: 'html', label: 'HTML Table (.html)' },
            { value: 'json', label: 'JSON Data (.json)' }
        ];
    } else if (['ods'].includes(fileExtension)) {
        // OpenDocument Spreadsheet
        
        formats = [
            { value: 'xlsx', label: 'Excel Spreadsheet (.xlsx)' },
            { value: 'xls', label: 'Excel 97-2003 (.xls)' },
            { value: 'csv', label: 'CSV File (.csv)' },
            { value: 'pdf', label: 'PDF Document (.pdf)' },
            { value: 'html', label: 'HTML Table (.html)' }
        ];
    } else if (['ppt', 'pptx'].includes(fileExtension)) {
        // PowerPoint presentations
        
        formats = [
            { value: 'pdf', label: 'PDF Document (.pdf)' },
            { value: 'odp', label: 'OpenDocument Presentation (.odp)' },
            { value: 'html', label: 'HTML Presentation (.html)' },
            { value: 'jpg', label: 'JPEG Images (.jpg)' },
            { value: 'png', label: 'PNG Images (.png)' }
        ];
    } else if (['odp'].includes(fileExtension)) {
        // OpenDocument Presentation
        
        formats = [
            { value: 'pdf', label: 'PDF Document (.pdf)' },
            { value: 'pptx', label: 'PowerPoint (.pptx)' },
            { value: 'ppt', label: 'PowerPoint 97-2003 (.ppt)' },
            { value: 'html', label: 'HTML Presentation (.html)' }
        ];
    } else {
        // Unsupported formats - Show message instead of options
        
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'This file format is not currently supported';
        option.disabled = true;
        outputFormat.appendChild(option);
        return;
    }
    
    // Remove the input format from output options (can't convert to same format)
    formats = formats.filter(format => format.value !== fileExtension);
    
    // Add formats to select element
    formats.forEach(format => {
        const option = document.createElement('option');
        option.value = format.value;
        option.textContent = format.label;
        outputFormat.appendChild(option);
    });
    
    // Auto-select if only one option available
    if (formats.length === 1) {
        outputFormat.value = formats[0].value;
    }
    
    // Show/hide advanced options based on file type
    updateAdvancedOptions(fileExtension, formats.length > 0 ? formats[0].value : '');
}

function updateAdvancedOptions(inputFormat, outputFormat) {
    // Get all advanced option groups
    const imageQualityGroup = document.getElementById('image-quality-group');
    const imageResolutionGroup = document.getElementById('image-resolution-group');
    const pdfOptionsGroup = document.getElementById('pdf-options-group');
    const textOptionsGroup = document.getElementById('text-options-group');
    
    // Hide all groups initially
    imageQualityGroup.style.display = 'none';
    imageResolutionGroup.style.display = 'none';
    pdfOptionsGroup.style.display = 'none';
    textOptionsGroup.style.display = 'none';
    
    // Show relevant options based on input and output formats
    const imageFormats = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'gif'];
    const isImageInput = imageFormats.includes(inputFormat);
    const isImageOutput = imageFormats.includes(outputFormat);
    
    if (isImageInput || isImageOutput) {
        imageQualityGroup.style.display = 'block';
        imageResolutionGroup.style.display = 'block';
    }
    
    if (outputFormat === 'pdf' || inputFormat === 'pdf') {
        pdfOptionsGroup.style.display = 'block';
    }
    
    if (outputFormat === 'txt' || inputFormat === 'txt') {
        textOptionsGroup.style.display = 'block';
    }
}

// Simulate AI suggestion based on file type
function simulateAiSuggestion(file) {
    const suggestionContent = document.getElementById('suggestion-content');
    const aiSuggestion = document.getElementById('ai-suggestion');
    
    // Show loading state
    suggestionContent.innerHTML = `
        <div class="suggestion-loading">
            <div class="loading-bar"></div>
            <div class="loading-bar"></div>
        </div>
    `;
    
    // Simulate processing delay
    setTimeout(() => {
        const fileName = file.name.toLowerCase();
        
        if (fileName.endsWith('.pdf')) {
            // Suggest based on PDF content (simulated)
            if (fileName.includes('report') || fileName.includes('doc')) {
                suggestionContent.innerHTML = `
                    <p>Based on your PDF content, we recommend converting to <strong>Word (.docx)</strong> for easy editing.</p>
                    <button class="btn btn-select" onclick="applyAiSuggestion('docx')">Apply Suggestion</button>
                `;
            } else if (fileName.includes('table') || fileName.includes('data')) {
                suggestionContent.innerHTML = `
                    <p>Your PDF appears to contain tabular data. We recommend converting to <strong>Excel (.xlsx)</strong>.</p>
                    <button class="btn btn-select" onclick="applyAiSuggestion('xlsx')">Apply Suggestion</button>
                `;
            } else if (fileName.includes('slide') || fileName.includes('presentation')) {
                suggestionContent.innerHTML = `
                    <p>This looks like a presentation. We recommend converting to <strong>PowerPoint (.pptx)</strong>.</p>
                    <button class="btn btn-select" onclick="applyAiSuggestion('pptx')">Apply Suggestion</button>
                `;
            } else if (fileName.includes('image') || fileName.includes('scan')) {
                suggestionContent.innerHTML = `
                    <p>This PDF contains images. We recommend converting to <strong>JPEG</strong> with OCR enabled.</p>
                    <button class="btn btn-select" onclick="applyAiSuggestion('jpg', true)">Apply Suggestion</button>
                `;
            } else {
                suggestionContent.innerHTML = `
                    <p>Based on your file, we recommend converting to <strong>Word (.docx)</strong> for best results.</p>
                    <button class="btn btn-select" onclick="applyAiSuggestion('docx')">Apply Suggestion</button>
                `;
            }
        } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
            // Word document
            suggestionContent.innerHTML = `
                <p>Your Word document will be converted to a high-quality PDF with preserved formatting.</p>
                <button class="btn btn-select" onclick="applyAiSuggestion('pdf')">Apply Suggestion</button>
            `;
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            // Excel spreadsheet
            suggestionContent.innerHTML = `
                <p>Your Excel spreadsheet will be converted to PDF with optimized table layout.</p>
                <button class="btn btn-select" onclick="applyAiSuggestion('pdf')">Apply Suggestion</button>
            `;
        } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png')) {
            // Image file
            suggestionContent.innerHTML = `
                <p>Your image will be converted to PDF. We recommend enabling OCR to extract any text.</p>
                <button class="btn btn-select" onclick="applyAiSuggestion('pdf', true)">Apply Suggestion</button>
            `;
        } else {
            // Error or unsupported file
            aiSuggestion.querySelector('.suggestion-header h3').textContent = getTranslation('aiError');
            suggestionContent.innerHTML = `
                <div class="suggestion-error">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p>Unable to analyze this file type. Please select a conversion format manually.</p>
                </div>
            `;
        }
    }, 1500); // 1.5 second delay to simulate processing
}

// Apply AI suggestion
function applyAiSuggestion(format, enableOcr = false) {
    // Set the output format
    const outputFormat = document.getElementById('output-format');
    if (outputFormat) {
        outputFormat.value = format;
    }
    
    // Set OCR option if suggested
    const ocrOption = document.getElementById('ocr-option');
    if (ocrOption && enableOcr) {
        ocrOption.checked = true;
    }
    
    // Scroll to conversion options
    document.querySelector('.conversion-options').scrollIntoView({ behavior: 'smooth' });
}

// Handle the conversion process
function handleConversion() {
    // Get selected options
    const outputFormat = document.getElementById('output-format').value;
    const ocrEnabled = document.getElementById('ocr-option').checked;
    const compressionLevel = document.getElementById('compression-level').value;
    
    // Get advanced options
    const imageQuality = document.getElementById('image-quality').value;
    const imageResolution = document.getElementById('image-resolution').value;
    const preserveFormatting = document.getElementById('preserve-formatting').checked;
    const textEncoding = document.getElementById('text-encoding').value;
    
    // Validate selection
    if (!outputFormat) {
        showNotification('Please select an output format', 'error');
        return;
    }
    
    // Store advanced options for the conversion
    window.conversionOptions = {
        outputFormat,
        ocrEnabled,
        compressionLevel,
        imageQuality,
        imageResolution,
        preserveFormatting,
        textEncoding
    };
    
    // Skip loading overlay - proceed directly to conversion
    
    // Show conversion result (which will upload and convert the file)
    showConversionResult(outputFormat);
}

// Show conversion result
function showConversionResult(outputFormat) {
    // Hide file processing section
    document.getElementById('file-processing').classList.add('hidden');
    
    // Show conversion result modal instead of page section
    const conversionModal = document.getElementById('conversion-modal');
    conversionModal.classList.remove('hidden');
    
    // Upload the file to the server and get the converted file URL
    uploadAndConvertFile(outputFormat);
    
    // Enhanced conversion progress with detailed steps
    function startConversionProgress(outputFormat) {
        let progress = 0;
        const steps = [
            { message: "Uploading file...", percentage: 10, step: "Step 1 of 4", time: "30s" },
            { message: "Analyzing file structure...", percentage: 30, step: "Step 2 of 4", time: "20s" },
            { message: "Converting to " + outputFormat.toUpperCase() + "...", percentage: 70, step: "Step 3 of 4", time: "10s" },
            { message: "Finalizing conversion...", percentage: 90, step: "Step 4 of 4", time: "5s" }
        ];
        
        let currentStepIndex = 0;
        
        // Clear any existing interval
        if (window.conversionProgressInterval) {
            clearInterval(window.conversionProgressInterval);
        }
        
        window.conversionProgressInterval = setInterval(() => {
            if (currentStepIndex < steps.length) {
                const currentStep = steps[currentStepIndex];
                updateProgressStatus(
                    currentStep.message, 
                    currentStep.percentage, 
                    currentStep.step, 
                    currentStep.time
                );
                currentStepIndex++;
            } else {
                clearInterval(window.conversionProgressInterval);
            }
        }, 2000); // Update every 2 seconds
    }

    // Enhanced file upload and conversion with better progress tracking
    function uploadAndConvertFile(outputFormat) {
        // Get all conversion options (use stored options if available)
        const options = window.conversionOptions || {};
        const ocrEnabled = options.ocrEnabled || document.getElementById('ocr-option').checked;
        const compressionLevel = options.compressionLevel || document.getElementById('compression-level').value;
        
        // Create FormData object
        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('sessionId', sessionId);
        
        // Start enhanced progress tracking
        startConversionProgress(outputFormat);
        
        // First upload the file
        fetch(`${API_BASE_URL}/api/upload`, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            updateProgressStatus('File uploaded successfully!', 25, 'Step 2 of 4', '25s');
            
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(getErrorMessage(response.status, errorData));
                });
            }
            return response.json();
        })
        .then(data => {
            updateProgressStatus('Starting conversion process...', 40, 'Step 3 of 4', '15s');
            
            // Now convert the file
            return fetch(`${API_BASE_URL}/api/convert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fileId: data.fileId,
                    outputFormat: outputFormat,
                    sessionId: sessionId,
                    options: {
                        ocr: ocrEnabled,
                        compression: compressionLevel,
                        imageQuality: options.imageQuality || 'high',
                        imageResolution: options.imageResolution || '150',
                        preserveFormatting: options.preserveFormatting || false,
                        textEncoding: options.textEncoding || 'utf-8'
                    }
                })
            });
        })
        .then(response => {
            updateProgressStatus('Processing conversion...', 80, 'Step 4 of 4', '5s');
            
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(getErrorMessage(response.status, errorData));
                });
            }
            return response.json();
        })
        .then(data => {
            updateProgressStatus('Conversion completed successfully!', 100, 'Complete!', '0s');
            
            // Store the converted file URL
            convertedFileUrl = data.url;
            
            // Clear the progress interval
            if (window.conversionProgressInterval) {
                clearInterval(window.conversionProgressInterval);
            }
            
            // Hide loading overlay immediately after completion
            const loadingOverlay = document.getElementById('loading-overlay');
            loadingOverlay.classList.add('hidden');
            
            // Generate a share URL with the session ID
            const shareUrl = document.getElementById('share-url');
            shareUrl.value = data.sessionUrl || `${window.location.origin}${window.location.pathname}?session=${sessionId}`;
            
            // Show small success message instead of large notification
            showConversionSuccessMessage(outputFormat);
            
            // Show preview based on output format
            updatePreview(outputFormat, data.url);
        })
        .catch(error => {
            console.error('Conversion error:', error);
            
            // Clear the progress interval
            if (window.conversionProgressInterval) {
                clearInterval(window.conversionProgressInterval);
            }
            
            // Hide loading overlay
            const loadingOverlay = document.getElementById('loading-overlay');
            loadingOverlay.classList.add('hidden');
            
            // Show detailed error notification with retry option
            showDetailedError(error.message, outputFormat);
            
            // Reset to upload state
            resetConversion();
        });
    }

    // Enhanced conversion handling with better loading states
    function handleConversion() {
        const outputFormat = document.getElementById('output-format').value;
        
        if (!outputFormat) {
            showNotification('Please select an output format', 'warning');
            return;
        }
        
        // Store conversion options for potential retry
        window.conversionOptions = {
            ocrEnabled: document.getElementById('ocr-option').checked,
            compressionLevel: document.getElementById('compression-level').value,
            imageQuality: document.getElementById('image-quality')?.value || 'high',
            imageResolution: document.getElementById('image-resolution')?.value || '150',
            preserveFormatting: document.getElementById('preserve-formatting')?.checked || false,
            textEncoding: document.getElementById('text-encoding')?.value || 'utf-8'
        };
        
        // Skip loading overlay - proceed directly to conversion
        
        // Start the conversion process
        uploadAndConvertFile(outputFormat);
    }

    // Enhanced progress status updates with step tracking and tips
    function updateProgressStatus(message, percentage, step = null, estimatedTime = null) {
        const loadingText = document.getElementById('loading-text');
        const progressBar = document.getElementById('progress-bar');
        const progressPercentage = document.getElementById('progress-percentage');
        const loadingStep = document.getElementById('loading-step');
        const loadingTime = document.getElementById('loading-time');
        const loadingTip = document.getElementById('loading-tip');
        
        if (loadingText) {
            loadingText.textContent = message;
        }
        
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
        
        if (progressPercentage) {
            progressPercentage.textContent = `${Math.round(percentage)}%`;
        }
        
        if (loadingStep && step) {
            loadingStep.textContent = step;
        }
        
        if (loadingTime && estimatedTime) {
            loadingTime.textContent = `Estimated time: ${estimatedTime}`;
        }
        
        // Update tip based on progress
        if (loadingTip) {
            const tips = [
                "DocSwap supports over 50 file formats!",
                "Your files are processed securely and deleted after conversion.",
                "Pro tip: Use batch conversion for multiple files!",
                "DocSwap works offline - no internet required after loading!",
                "All conversions maintain original file quality.",
                "You can convert files up to 100MB in size!",
                "DocSwap is completely free with no hidden costs.",
                "Your privacy is protected - we don't store your files."
            ];
            
            const tipIndex = Math.floor(percentage / 12.5) % tips.length;
            loadingTip.textContent = tips[tipIndex];
        }
    }

    // Enhanced conversion progress with detailed steps
    function startConversionProgress(outputFormat) {
        let progress = 0;
        const steps = [
            { message: "Uploading file...", percentage: 10, step: "Step 1 of 4", time: "30s" },
            { message: "Analyzing file structure...", percentage: 30, step: "Step 2 of 4", time: "20s" },
            { message: "Converting to " + outputFormat.toUpperCase() + "...", percentage: 70, step: "Step 3 of 4", time: "10s" },
            { message: "Finalizing conversion...", percentage: 90, step: "Step 4 of 4", time: "5s" }
        ];
        
        let currentStepIndex = 0;
        
        // Clear any existing interval
        if (window.conversionProgressInterval) {
            clearInterval(window.conversionProgressInterval);
        }
        
        window.conversionProgressInterval = setInterval(() => {
            if (currentStepIndex < steps.length) {
                const currentStep = steps[currentStepIndex];
                updateProgressStatus(
                    currentStep.message, 
                    currentStep.percentage, 
                    currentStep.step, 
                    currentStep.time
                );
                currentStepIndex++;
            } else {
                clearInterval(window.conversionProgressInterval);
            }
        }, 2000); // Update every 2 seconds
    }

    // Enhanced file upload and conversion with better progress tracking
    function uploadAndConvertFile(outputFormat) {
        // Get all conversion options (use stored options if available)
        const options = window.conversionOptions || {};
        const ocrEnabled = options.ocrEnabled || document.getElementById('ocr-option').checked;
        const compressionLevel = options.compressionLevel || document.getElementById('compression-level').value;
        
        // Create FormData object
        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('sessionId', sessionId);
        
        // Start enhanced progress tracking
        startConversionProgress(outputFormat);
        
        // First upload the file
        fetch(`${API_BASE_URL}/api/upload`, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            updateProgressStatus('File uploaded successfully!', 25, 'Step 2 of 4', '25s');
            
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(getErrorMessage(response.status, errorData));
                });
            }
            return response.json();
        })
        .then(data => {
            updateProgressStatus('Starting conversion process...', 40, 'Step 3 of 4', '15s');
            
            // Now convert the file
            return fetch(`${API_BASE_URL}/api/convert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fileId: data.fileId,
                    outputFormat: outputFormat,
                    sessionId: sessionId,
                    options: {
                        ocr: ocrEnabled,
                        compression: compressionLevel,
                        imageQuality: options.imageQuality || 'high',
                        imageResolution: options.imageResolution || '150',
                        preserveFormatting: options.preserveFormatting || false,
                        textEncoding: options.textEncoding || 'utf-8'
                    }
                })
            });
        })
        .then(response => {
            updateProgressStatus('Processing conversion...', 80, 'Step 4 of 4', '5s');
            
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(getErrorMessage(response.status, errorData));
                });
            }
            return response.json();
        })
        .then(data => {
            updateProgressStatus('Conversion completed successfully!', 100, 'Complete!', '0s');
            
            // Store the converted file URL
            convertedFileUrl = data.url;
            
            // Clear the progress interval
            if (window.conversionProgressInterval) {
                clearInterval(window.conversionProgressInterval);
            }
            
            // Hide loading overlay immediately after completion
            const loadingOverlay = document.getElementById('loading-overlay');
            loadingOverlay.classList.add('hidden');
            
            // Generate a share URL with the session ID
            const shareUrl = document.getElementById('share-url');
            shareUrl.value = data.sessionUrl || `${window.location.origin}${window.location.pathname}?session=${sessionId}`;
            
            // Show small success message instead of large notification
            showConversionSuccessMessage(outputFormat);
            
            // Show preview based on output format
            updatePreview(outputFormat, data.url);
        })
        .catch(error => {
            console.error('Conversion error:', error);
            
            // Clear the progress interval
            if (window.conversionProgressInterval) {
                clearInterval(window.conversionProgressInterval);
            }
            
            // Hide loading overlay
            const loadingOverlay = document.getElementById('loading-overlay');
            loadingOverlay.classList.add('hidden');
            
            // Show detailed error notification with retry option
            showDetailedError(error.message, outputFormat);
            
            // Reset to upload state
            resetConversion();
        });
    }

    // Enhanced conversion handling with better loading states
    function handleConversion() {
        const outputFormat = document.getElementById('output-format').value;
        
        if (!outputFormat) {
            showNotification('Please select an output format', 'warning');
            return;
        }
        
        // Store conversion options for potential retry
        window.conversionOptions = {
            ocrEnabled: document.getElementById('ocr-option').checked,
            compressionLevel: document.getElementById('compression-level').value,
            imageQuality: document.getElementById('image-quality')?.value || 'high',
            imageResolution: document.getElementById('image-resolution')?.value || '150',
            preserveFormatting: document.getElementById('preserve-formatting')?.checked || false,
            textEncoding: document.getElementById('text-encoding')?.value || 'utf-8'
        };
        
        // Skip loading overlay - proceed directly to conversion
        
        // Start the conversion process
        uploadAndConvertFile(outputFormat);
    }

    // Get user-friendly error messages
    function getErrorMessage(statusCode, errorData) {
        const errorMessage = errorData?.error || 'Unknown error occurred';
        
        switch (statusCode) {
            case 400:
                if (errorMessage.includes('Too many files') || errorMessage.includes('Session storage full')) {
                    return 'Session storage is full. Your session will be automatically cleaned up, or you can refresh the page to start fresh.';
                }
                if (errorMessage.includes('Cannot convert')) {
                    return `This conversion type is not supported. Please try a different output format.`;
                }
                return `Invalid request: ${errorMessage}`;
            
            case 413:
                return 'File is too large. Please try a smaller file (maximum 50MB).';
            
            case 415:
                return 'File type not supported. Please try a different file format.';
            
            case 429:
                return 'Too many requests. Please wait a moment before trying again.';
            
            case 500:
                return 'Server error occurred. Please try again in a few moments.';
            
            case 503:
                return 'Service temporarily unavailable. Please try again later.';
            
            default:
                return `Error: ${errorMessage}`;
        }
    }

    // Show detailed error with retry options
    function showDetailedError(errorMessage, outputFormat) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'detailed-error-container';
        errorContainer.innerHTML = `
            <div class="error-overlay">
                <div class="error-modal">
                    <div class="error-header">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        <h3>Conversion Failed</h3>
                    </div>
                    <div class="error-body">
                        <p class="error-message">${errorMessage}</p>
                        <div class="error-suggestions">
                            <h4>What you can try:</h4>
                            <ul>
                                <li>Check if your file format is supported</li>
                                <li>Try a different output format</li>
                                <li>Ensure your file is not corrupted</li>
                                <li>Wait a moment and try again</li>
                            </ul>
                        </div>
                    </div>
                    <div class="error-actions">
                        <button class="btn-secondary" onclick="closeErrorModal()">Cancel</button>
                        <button class="btn-primary" onclick="retryConversion('${outputFormat}')">Try Again</button>
                        <button class="btn-tertiary" onclick="chooseNewFile()">Choose Different File</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(errorContainer);
        
        // Add styles for error modal
        if (!document.getElementById('error-modal-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'error-modal-styles';
            styleEl.textContent = `
                .detailed-error-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 10000;
                }
                .error-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .error-modal {
                    background: white;
                    border-radius: 12px;
                    max-width: 500px;
                    width: 100%;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                    animation: errorModalSlideIn 0.3s ease-out;
                }
                @keyframes errorModalSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                .error-header {
                    text-align: center;
                    padding: 30px 30px 20px;
                    border-bottom: 1px solid #eee;
                }
                .error-header h3 {
                    margin: 15px 0 0;
                    color: #e74c3c;
                    font-size: 24px;
                    font-weight: 600;
                }
                .error-body {
                    padding: 25px 30px;
                }
                .error-message {
                    font-size: 16px;
                    color: #333;
                    margin-bottom: 20px;
                    line-height: 1.5;
                }
                .error-suggestions h4 {
                    color: #555;
                    margin-bottom: 10px;
                    font-size: 14px;
                    font-weight: 600;
                }
                .error-suggestions ul {
                    margin: 0;
                    padding-left: 20px;
                    color: #666;
                    font-size: 14px;
                }
                .error-suggestions li {
                    margin-bottom: 5px;
                }
                .error-actions {
                    padding: 20px 30px 30px;
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                }
                .error-actions button {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .btn-primary {
                    background: #3498db;
                    color: white;
                }
                .btn-primary:hover {
                    background: #2980b9;
                }
                .btn-secondary {
                    background: #95a5a6;
                    color: white;
                }
                .btn-secondary:hover {
                    background: #7f8c8d;
                }
                .btn-tertiary {
                    background: #ecf0f1;
                    color: #2c3e50;
                }
                .btn-tertiary:hover {
                    background: #d5dbdb;
                }
            `;
            document.head.appendChild(styleEl);
        }
    }

    // Close error modal
    function closeErrorModal() {
        const errorContainer = document.querySelector('.detailed-error-container');
        if (errorContainer) {
            errorContainer.remove();
        }
    }

    // Retry conversion
    function retryConversion(outputFormat) {
        closeErrorModal();
        
        // Show notification about retry
        showNotification('Retrying conversion...', 'info');
        
        // Wait a moment before retrying to avoid rate limits
        setTimeout(() => {
            handleConversion();
        }, 2000);
    }

    // Choose new file
    function chooseNewFile() {
        closeErrorModal();
        resetConversion();
        
        // Trigger file input click
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.click();
        }
    }

    // Update preview based on output format
    function updatePreview(outputFormat, fileUrl) {
        const previewContainer = document.getElementById('modal-preview-container');
        
        // Add preview parameter to the URL to ensure inline display
        const previewUrl = fileUrl.includes('?') ? 
            `${fileUrl}&preview=true` : 
            `${fileUrl}?preview=true`;
        
        // Add cache-busting parameter to prevent browser caching issues
        const cacheBustUrl = `${previewUrl}&t=${new Date().getTime()}`;
        
        if (outputFormat === 'pdf' || currentFile.type === 'application/pdf') {
            // PDF preview with enhanced error handling
            previewContainer.innerHTML = `
                <div class="preview-wrapper">
                    <iframe src="${cacheBustUrl}" title="PDF Preview" 
                            style="width: 100%; height: 500px; border: none;"
                            onload="this.parentNode.classList.add('loaded')"
                            onerror="handlePreviewError(this, '${fileUrl}', 'pdf')">
                    </iframe>
                    <div class="preview-loading">
                        <div class="spinner"></div>
                        <p>Loading PDF preview...</p>
                    </div>
                </div>
            `;
        } else if (outputFormat === 'jpg' || outputFormat === 'png' || outputFormat === 'jpeg') {
            // Image preview with enhanced error handling
            previewContainer.innerHTML = `
                <div class="preview-wrapper">
                    <img src="${cacheBustUrl}" alt="Converted Image" 
                         onload="this.parentNode.classList.add('loaded')"
                         onerror="handlePreviewError(this, '${fileUrl}', 'image')"
                         style="max-width: 100%; height: auto;">
                <div class="preview-loading">
                    <div class="spinner"></div>
                    <p>Loading image preview...</p>
                </div>
            </div>
        `;
        } else {
            // Generic preview for other formats
            previewContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <p style="margin-top: 1rem;">Preview not available for ${outputFormat.toUpperCase()} format</p>
                    <p>Click the Download button to access your converted file</p>
                </div>
            `;
        }
        
        // Store the download URL (without preview parameter) for the download button
        convertedFileUrl = fileUrl;
        
        // Add CSS for preview loading state if not already present
        if (!document.getElementById('preview-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'preview-styles';
            styleEl.textContent = `
                .preview-wrapper {
                    position: relative;
                    min-height: 200px;
                }
                .preview-loading {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255,255,255,0.9);
                    z-index: 1;
                }
                .preview-wrapper.loaded .preview-loading {
                    display: none;
                }
                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 10px;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .error-message {
                    text-align: center;
                    padding: 20px;
                    background-color: #fff8f8;
                    border: 1px solid #ffcdd2;
                    border-radius: 4px;
                    margin: 10px 0;
                }
                .error-message p {
                    margin-bottom: 10px;
                }
                .retry-button {
                    background-color: #4CAF50;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-right: 10px;
                }
                .download-button {
                    background-color: #2196F3;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                }
            `;
            document.head.appendChild(styleEl);
        }
    }

    // Handle preview errors
    function handlePreviewError(element, fileUrl, type) {
        // Hide the element that failed to load
        element.style.display = 'none';
        
        // Create error message with retry and download options
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <p>Unable to display ${type}. The file may still be processing or the format might not be supported by your browser.</p>
            <button class="retry-button" onclick="retryPreview('${fileUrl}', '${type}')">Retry Preview</button>
            <a href="${fileUrl}" download class="download-button">Download File</a>
        `;
        
        // Find the preview wrapper and append the error message
        const previewWrapper = element.closest('.preview-wrapper') || element.parentNode;
        previewWrapper.appendChild(errorDiv);
        
        // Hide the loading indicator
        const loadingEl = previewWrapper.querySelector('.preview-loading');
        if (loadingEl) loadingEl.style.display = 'none';
    }

    // Retry loading the preview
    function retryPreview(fileUrl, type) {
        // Get the preview container
        const previewContainer = document.getElementById('preview-container');
        
        // Add cache-busting parameter
        const cacheBustUrl = `${fileUrl}?preview=true&t=${new Date().getTime()}`;
        
        if (type === 'pdf') {
            // Recreate PDF preview
            updatePreview('pdf', fileUrl);
        } else if (type === 'image') {
            // Recreate image preview
            updatePreview('jpg', fileUrl);
        }
    }
}

// Setup professional page state management
function setupPageStateManagement() {
    // Handle browser back/forward navigation
    window.addEventListener('popstate', () => {
        resetPageToHome();
    });
    
    // Prevent scroll restoration on page reload
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
}

// Reset page to home state with professional UX
function resetPageToHome() {
    // Check if conversion modal is open - if so, don't auto-reset
    const conversionModal = document.getElementById('conversion-modal');
    if (conversionModal && !conversionModal.classList.contains('hidden')) {
        return; // Don't reset if modal is open
    }
    
    // Smooth scroll to top of page
    window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
    });
    
    // Ensure we're in the home state with smooth transitions
    const uploadContainer = document.getElementById('upload-container');
    const fileProcessing = document.getElementById('file-processing');
    const conversionResult = document.getElementById('conversion-result');
    
    if (uploadContainer) uploadContainer.classList.remove('hidden');
    if (fileProcessing) fileProcessing.classList.add('hidden');
    if (conversionResult) conversionResult.classList.add('hidden');
    
    // Only close conversion modal if explicitly called (not from auto-reset)
    // The modal should only be closed by user action or explicit reset
    
    // Clear any URL parameters that might affect state
    if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Add subtle visual feedback that the page has reset
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
        heroSection.style.opacity = '0.8';
        setTimeout(() => {
            heroSection.style.opacity = '1';
        }, 200);
    }
}

// Reset the conversion process
function resetConversion() {
    // Reset file input
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.value = '';
    }
    
    // Reset current file
    currentFile = null;
    convertedFileUrl = null;
    
    // Hide result and processing sections
    document.getElementById('file-processing').classList.add('hidden');
    document.getElementById('conversion-result').classList.add('hidden');
    
    // Hide conversion modal if open
    const conversionModal = document.getElementById('conversion-modal');
    if (conversionModal) {
        conversionModal.classList.add('hidden');
    }
    
    // Show upload container and reset its state
    const uploadContainer = document.getElementById('upload-container');
    uploadContainer.classList.remove('hidden');
    uploadContainer.classList.remove('file-uploaded');
    
    // Reset advanced options
    document.getElementById('ocr-option').checked = false;
    document.getElementById('compression-level').value = 'medium';
    
    // Hide advanced content
    const advancedContent = document.querySelector('.advanced-content');
    if (advancedContent) {
        advancedContent.classList.add('hidden');
    }
    
    // Reset arrow icon
    const arrow = document.querySelector('.advanced-toggle svg');
    if (arrow) {
        arrow.style.transform = 'rotate(0deg)';
    }
    
    // Scroll back to home section for professional UX
    setTimeout(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
    }, 100); // Small delay to ensure DOM updates are complete
}

// Close conversion modal
function closeConversionModal() {
    const conversionModal = document.getElementById('conversion-modal');
    if (conversionModal) {
        conversionModal.classList.add('hidden');
    }
}

// Show notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Add icon based on type
    let icon = '';
    switch (type) {
        case 'success':
            icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
            break;
        case 'error':
            icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
            break;
        case 'warning':
            icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
            break;
        default:
            icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>';
    }
    
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">${icon}</div>
            <div class="notification-message">${message}</div>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `;
    
    // Add notification styles if not present
    if (!document.getElementById('notification-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'notification-styles';
        styleEl.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                min-width: 300px;
                max-width: 500px;
                border-radius: 8px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                animation: notificationSlideIn 0.3s ease-out;
            }
            @keyframes notificationSlideIn {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            .notification-content {
                display: flex;
                align-items: center;
                padding: 16px;
                gap: 12px;
            }
            .notification-icon {
                flex-shrink: 0;
            }
            .notification-message {
                flex: 1;
                font-size: 14px;
                line-height: 1.4;
            }
            .notification-close {
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                opacity: 0.7;
                transition: opacity 0.2s ease;
            }
            .notification-close:hover {
                opacity: 1;
            }
            .notification-success {
                background: #d1ecf1;
                color: #0c5460;
                border-left: 4px solid #17a2b8;
            }
            .notification-error {
                background: #f8d7da;
                color: #721c24;
                border-left: 4px solid #dc3545;
            }
            .notification-warning {
                background: #fff3cd;
                color: #856404;
                border-left: 4px solid #ffc107;
            }
            .notification-info {
                background: #d1ecf1;
                color: #0c5460;
                border-left: 4px solid #17a2b8;
            }
        `;
        document.head.appendChild(styleEl);
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds (except for errors)
    if (type !== 'error') {
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get converted file name
function getConvertedFileName() {
    if (!currentFile) return 'converted-file';
    
    const originalName = currentFile.name;
    const outputFormat = document.getElementById('output-format').value;
    
    // Get file name without extension
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
    
    return `${nameWithoutExt}-converted.${outputFormat}`;
}

// Robust scroll to conversion options function
function scrollToConversionOptions() {
    // Function to attempt scrolling with retries
    function attemptScroll(retries = 3) {
        const conversionOptions = document.querySelector('.conversion-options');
        
        if (!conversionOptions) {
            console.warn('Conversion options element not found');
            if (retries > 0) {
                setTimeout(() => attemptScroll(retries - 1), 200);
            }
            return;
        }
        
        // Check if element is visible and has dimensions
        const rect = conversionOptions.getBoundingClientRect();
        if (rect.height === 0 || rect.width === 0) {
            console.warn('Conversion options element not visible yet');
            if (retries > 0) {
                setTimeout(() => attemptScroll(retries - 1), 200);
            }
            return;
        }
        
        // Perform the scroll
        try {
            // First try with scrollIntoView
            conversionOptions.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest'
            });
            
            // Add visual feedback
            setTimeout(() => {
                conversionOptions.style.transition = 'box-shadow 0.5s ease, transform 0.5s ease';
                conversionOptions.style.boxShadow = '0 0 25px rgba(99, 102, 241, 0.4)';
                conversionOptions.style.transform = 'scale(1.02)';
                
                // Remove highlight after animation
                setTimeout(() => {
                    conversionOptions.style.boxShadow = '';
                    conversionOptions.style.transform = 'scale(1)';
                }, 2000);
            }, 300);
            
            console.log('Successfully scrolled to conversion options');
            
        } catch (error) {
            console.error('Error scrolling to conversion options:', error);
            
            // Fallback: try manual scroll calculation
            try {
                const elementTop = conversionOptions.offsetTop;
                const elementHeight = conversionOptions.offsetHeight;
                const windowHeight = window.innerHeight;
                const scrollTop = elementTop - (windowHeight / 2) + (elementHeight / 2);
                
                window.scrollTo({
                    top: scrollTop,
                    behavior: 'smooth'
                });
                
                console.log('Fallback scroll successful');
            } catch (fallbackError) {
                console.error('Fallback scroll also failed:', fallbackError);
            }
        }
    }
    
    // Start the scroll attempt
    attemptScroll();
}

// Scroll optimization functions
function initScrollOptimizations() {
    // Debounce function for scroll events
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle function for high-frequency events
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    // Optimized scroll handler
    const optimizedScrollHandler = throttle(() => {
        // Minimal scroll processing
        requestAnimationFrame(() => {
            // Any scroll-related animations or updates go here
            // Currently just ensuring smooth performance
        });
    }, 16); // ~60fps

    // Add passive scroll listener for better performance
    if (window.addEventListener) {
        window.addEventListener('scroll', optimizedScrollHandler, { passive: true });
        window.addEventListener('wheel', (e) => {
            // Passive wheel event for smooth scrolling
        }, { passive: true });
        
        // Touch events for mobile optimization
        window.addEventListener('touchstart', (e) => {
             // Passive touch events
         }, { passive: true });
         
         window.addEventListener('touchmove', (e) => {
             // Passive touch move events
         }, { passive: true });
     }

     // Intersection Observer for performance optimization
     if ('IntersectionObserver' in window) {
         const observerOptions = {
             root: null,
             rootMargin: '50px',
             threshold: 0.1
         };

         const observer = new IntersectionObserver((entries) => {
             entries.forEach(entry => {
                 if (entry.isIntersecting) {
                     // Element is visible, can trigger animations
                     entry.target.classList.add('in-view');
                 } else {
                     // Element is not visible, can pause animations
                     entry.target.classList.remove('in-view');
                 }
             });
         }, observerOptions);

         // Observe elements that have animations
         document.querySelectorAll('.feature-card, .conversion-options, .upload-area').forEach(el => {
             observer.observe(el);
         });
     }
 }

 // Translation helper function
 function getTranslation(key) {
     // Simple translation function - in a real app this would use i18n
     const translations = {
         'converting': 'Converting your file...',
         'copied': 'Link copied to clipboard!',
         'errorFileSize': 'File size exceeds 100MB limit',
         'selectOutputFormat': 'Select output format',
         'convertPdfTo': 'Convert PDF to:',
         'convertTo': 'Convert to:',
         'aiError': 'AI Analysis Error'
     };
     return translations[key] || key;
 }

// Bottom-right welcome notification
function showWelcomeNotification(message, type = 'info') {
    // Remove any existing welcome notification
    const existing = document.querySelector('.welcome-notification');
    if (existing) {
        existing.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `welcome-notification ${type}`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Upload loading circle functions
function showUploadLoading() {
    const uploadContainer = document.getElementById('upload-container');
    if (uploadContainer) {
        uploadContainer.classList.add('loading');
        
        // Create loading circle
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'upload-loading';
        loadingDiv.innerHTML = '<div class="upload-loading-circle"></div>';
        
        uploadContainer.appendChild(loadingDiv);
    }
}

function hideUploadLoading() {
    const uploadContainer = document.getElementById('upload-container');
    if (uploadContainer) {
        uploadContainer.classList.remove('loading');
        
        // Remove loading circle
        const loadingDiv = uploadContainer.querySelector('.upload-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }
}

// Show small conversion success message
function showConversionSuccessMessage(outputFormat) {
    const successMessage = document.getElementById('conversion-success-message');
    if (!successMessage) return;
    
    // Update the message text
    const successText = successMessage.querySelector('.success-text');
    if (successText) {
        successText.textContent = `Converted to ${outputFormat.toUpperCase()}!`;
    }
    
    // Show the message with animation
    successMessage.classList.remove('hidden');
    successMessage.classList.add('show', 'animate-in');
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        successMessage.classList.add('animate-out');
        successMessage.classList.remove('animate-in');
        
        // Hide completely after animation
        setTimeout(() => {
            successMessage.classList.add('hidden');
            successMessage.classList.remove('show', 'animate-out');
        }, 300);
    }, 4000);
}