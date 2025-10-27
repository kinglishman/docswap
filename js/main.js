window.API_BASE_URL = `${window.location.origin}/api`;

// Global variables
let currentFile = null;

// Generate a unique session ID
function generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// Enhanced conversion handling with better loading states  
function handleConversionWithOptions() {
        console.log('🔄 Convert Now button clicked!');
        
        const outputFormat = document.getElementById('output-format').value;
        console.log('📋 Selected output format:', outputFormat);
        
        if (!outputFormat) {
            console.log('⚠️ No output format selected');
            showNotification('Please select an output format', 'warning');
            return;
        }
        
        console.log('📁 Current file:', currentFile);
        
        // Store conversion options for potential retry
        window.conversionOptions = {
            ocrEnabled: document.getElementById('ocr-option').checked,
            compressionLevel: document.getElementById('compression-level').value,
            imageQuality: document.getElementById('image-quality')?.value || 'high',
            imageResolution: document.getElementById('image-resolution')?.value || '150',
            preserveFormatting: document.getElementById('preserve-formatting')?.checked || false,
            textEncoding: document.getElementById('text-encoding')?.value || 'utf-8'
        };
        
        console.log('⚙️ Conversion options:', window.conversionOptions);
        
        // Skip loading overlay - proceed directly to conversion
        
        // Start the conversion process
        console.log('🚀 Starting conversion process...');
        uploadAndConvertFile(outputFormat);
    }

// Get user-friendly error messages
function getErrorMessage(statusCode, errorData) {
        // Safely extract error message with proper type checking
        let errorMessage = 'Unknown error occurred';
        
        if (errorData) {
            if (typeof errorData === 'string') {
                errorMessage = errorData;
            } else if (typeof errorData === 'object') {
                errorMessage = errorData.error || errorData.message || errorData.detail || 'Unknown error occurred';
            }
        }
        
        // Ensure errorMessage is a string
        errorMessage = String(errorMessage);
        
        switch (statusCode) {
            case 400:
                if (errorMessage.includes('Too many files') || errorMessage.includes('Session storage full')) {
                    return 'Session storage is full. Your session will be automatically cleaned up, or you can refresh the page to start fresh.';
                }
                if (errorMessage.includes('Cannot convert')) {
                    return `This conversion type is not supported. Please try a different output format.`;
                }
                if (errorMessage.includes('Invalid file format')) {
                    return 'The file format is not recognized. Please ensure your file is not corrupted and try again.';
                }
                if (errorMessage.includes('File too large')) {
                    return 'File is too large for processing. Please try a smaller file (maximum 50MB).';
                }
                return `Invalid request: ${errorMessage}`;
            
            case 413:
                return 'File is too large. Please try a smaller file (maximum 50MB).';
            
            case 415:
                return 'File type not supported. Please check our supported formats and try a different file type.';
            
            case 422:
                return 'The file appears to be corrupted or invalid. Please try a different file.';
            
            case 429:
                return 'Too many requests. Please wait a moment before trying again to avoid rate limits.';
            
            case 500:
                return 'Server error occurred during conversion. Our team has been notified. Please try again in a few moments.';
            
            case 502:
                return 'Service temporarily unavailable. Please check your internet connection and try again.';
            
            case 503:
                return 'Service temporarily unavailable due to high demand. Please try again in a few minutes.';
            
            case 504:
                return 'Conversion timed out. This may happen with large files. Please try a smaller file or try again later.';
            
            default:
                if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
                    return 'Network error occurred. Please check your internet connection and try again.';
                }
                if (errorMessage.includes('timeout')) {
                    return 'Request timed out. Please try again with a smaller file or check your connection.';
                }
                return `Error: ${errorMessage}`;
        }
    }

// Generate specific error suggestions based on error message and context
function getErrorSuggestions(errorMessage, outputFormat) {
        const suggestions = [];
        
        if (errorMessage.includes('too large') || errorMessage.includes('File is too large')) {
            suggestions.push('Try compressing your file before conversion');
            suggestions.push('Use a file size reducer tool first');
            suggestions.push('Split large documents into smaller parts');
        } else if (errorMessage.includes('not supported') || errorMessage.includes('Invalid file format')) {
            suggestions.push('Check our supported file formats list');
            suggestions.push('Try saving your file in a different format first');
            suggestions.push('Ensure the file extension matches the actual file type');
        } else if (errorMessage.includes('corrupted') || errorMessage.includes('invalid')) {
            suggestions.push('Try opening and re-saving the file in its original application');
            suggestions.push('Check if the file opens correctly in other programs');
            suggestions.push('Try a different file to test if the issue persists');
        } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
            suggestions.push('Check your internet connection');
            suggestions.push('Try refreshing the page and uploading again');
            suggestions.push('Disable any VPN or proxy temporarily');
        } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
            suggestions.push('Try a smaller file size');
            suggestions.push('Check your internet connection speed');
            suggestions.push('Try again during off-peak hours');
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('Too many requests')) {
            suggestions.push('Wait a few minutes before trying again');
            suggestions.push('Avoid multiple simultaneous conversions');
        } else {
            // Default suggestions
            suggestions.push('Check if your file format is supported');
            suggestions.push('Try a different output format');
            suggestions.push('Ensure your file is not corrupted');
            suggestions.push('Wait a moment and try again');
        }
        
        // Add format-specific suggestions
        if (outputFormat) {
            if (outputFormat === 'pdf' && currentFile) {
                if (currentFile.type.includes('image')) {
                    suggestions.push('For image to PDF conversion, try reducing image resolution first');
                }
            }
            if (outputFormat === 'docx') {
                suggestions.push('Try converting to PDF first, then to DOCX if needed');
            }
        }
        
        return suggestions;
    }

// Show detailed error with retry options and specific suggestions
function showDetailedError(errorMessage, outputFormat) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'detailed-error-container';
        
        // Generate specific suggestions based on error type
        const suggestions = getErrorSuggestions(errorMessage, outputFormat);
        
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
                                ${suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                            </ul>
                        </div>
                        ${currentFile ? `
                        <div class="error-file-info">
                            <h4>File Information:</h4>
                            <p><strong>Name:</strong> ${currentFile.name}</p>
                            <p><strong>Size:</strong> ${formatFileSize(currentFile.size)}</p>
                            <p><strong>Type:</strong> ${currentFile.type || 'Unknown'}</p>
                        </div>
                        ` : ''}
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
        
        // Add click-outside-to-close functionality
        const errorOverlay = errorContainer.querySelector('.error-overlay');
        if (errorOverlay) {
            errorOverlay.addEventListener('click', (e) => {
                if (e.target === errorOverlay) {
                    closeErrorModal();
                }
            });
        }
        
        // Add keyboard support
        document.addEventListener('keydown', handleErrorModalKeydown);
        
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
                    max-width: 450px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
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
                    padding: 15px;
                    background: #fef5f5;
                    border-left: 4px solid #e74c3c;
                    border-radius: 4px;
                }
                .error-suggestions h4, .error-file-info h4 {
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
                    margin-bottom: 8px;
                    line-height: 1.4;
                }
                .error-file-info {
                    margin-top: 20px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 6px;
                    border: 1px solid #e9ecef;
                }
                .error-file-info p {
                    margin: 5px 0;
                    font-size: 13px;
                    color: #666;
                }
                .error-file-info strong {
                    color: #333;
                }
                .error-actions {
                    padding: 20px 30px 30px;
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                    flex-wrap: wrap;
                }
                .error-actions button {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    min-width: 100px;
                }
                .btn-primary {
                    background: #3498db;
                    color: white;
                }
                .btn-primary:hover {
                    background: #2980b9;
                    transform: translateY(-1px);
                }
                .btn-secondary {
                    background: #95a5a6;
                    color: white;
                }
                .btn-secondary:hover {
                    background: #7f8c8d;
                    transform: translateY(-1px);
                }
                .btn-tertiary {
                    background: #ecf0f1;
                    color: #2c3e50;
                    border: 1px solid #bdc3c7;
                }
                .btn-tertiary:hover {
                    background: #d5dbdb;
                    transform: translateY(-1px);
                }
                
                @media (max-width: 480px) {
                    .error-modal {
                        max-width: 95%;
                        margin: 10px;
                    }
                    .error-actions {
                        flex-direction: column;
                    }
                    .error-actions button {
                        width: 100%;
                    }
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
        // Remove keyboard event listener
        document.removeEventListener('keydown', handleErrorModalKeydown);
    }
    
    function handleErrorModalKeydown(e) {
        if (!document.querySelector('.detailed-error-container')) return;
        
        if (e.key === 'Escape') {
            e.preventDefault();
            closeErrorModal();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const tryAgainBtn = document.querySelector('.detailed-error-container .btn-primary');
            if (tryAgainBtn) {
                tryAgainBtn.click();
            }
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
        
        // Small delay to ensure DOM updates are complete before triggering file input
        setTimeout(() => {
            const fileInput = document.getElementById('file-input');
            if (fileInput) {
                fileInput.click();
                console.log('🔄 File input triggered for new file selection');
            }
        }, 100);
    }

// Helper function to check if format is an image
function isImageFormat(format) {
    const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif', 'svg', 'ico'];
    return imageFormats.includes(format.toLowerCase());
}

// Update preview based on output format
function updatePreview(outputFormat, fileUrl) {
        const previewContainer = document.getElementById('result-preview-container');
        console.log('updatePreview called with:', { outputFormat, fileUrl, previewContainer });
        
        if (!previewContainer) {
            console.error('Preview container not found!');
            return;
        }
        
        if (!fileUrl) {
            console.error('No file URL provided for preview');
            return;
        }
        
        // Construct preview URL FIRST to ensure inline display
        // Add preview parameter to the URL to ensure inline display
        const previewUrl = (fileUrl && typeof fileUrl === 'string' && fileUrl.includes('?')) ? 
            `${fileUrl}&preview=true` : 
            `${fileUrl}?preview=true`;
        
        // Add cache-busting parameter to prevent browser caching issues
        const cacheBustUrl = `${previewUrl}&t=${new Date().getTime()}`;
        
        console.log('Preview URLs:', { original: fileUrl, preview: previewUrl, cacheBust: cacheBustUrl });
        console.log('Output format:', outputFormat, 'Is image format:', isImageFormat(outputFormat));
        
        // Show skeleton loading immediately for better UX
        showSkeletonPreview(previewContainer, outputFormat);
        
        // Delay actual content loading slightly to show skeleton
        setTimeout(async () => {
            try {
                if (outputFormat === 'pdf' || currentFile.type === 'application/pdf') {
                    // For PDFs, use direct iframe with sandbox to prevent auto-downloads
                    console.log('Loading PDF preview with sandbox to prevent auto-download...');
                    
                    previewContainer.innerHTML = `
                        <div class="preview-wrapper modern-preview">
                            <div class="modern-preview-loading" id="pdf-loading-indicator">
                                <div class="modern-spinner"></div>
                                <div class="loading-text">
                                    <h4>Loading PDF Preview</h4>
                                    <p id="pdf-loading-status">Preparing document...</p>
                                    <div class="progress-container">
                                        <div class="progress-bar-bg">
                                            <div class="progress-bar" id="pdf-progress-bar" style="width: 0%"></div>
                                        </div>
                                        <span class="progress-text" id="pdf-progress-text">0%</span>
                                    </div>
                                    <div class="pulse-loader">
                                        <div class="pulse-dot"></div>
                                        <div class="pulse-dot"></div>
                                        <div class="pulse-dot"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    // Simulate loading progress for better UX
                    const progressBar = document.getElementById('pdf-progress-bar');
                    const progressText = document.getElementById('pdf-progress-text');
                    const statusText = document.getElementById('pdf-loading-status');
                    
                    // Simulate progress
                    setTimeout(() => {
                        if (statusText) statusText.textContent = 'Loading document...';
                        if (progressBar) progressBar.style.width = '30%';
                        if (progressText) progressText.textContent = '30%';
                    }, 200);
                    
                    setTimeout(() => {
                        if (statusText) statusText.textContent = 'Rendering preview...';
                        if (progressBar) progressBar.style.width = '70%';
                        if (progressText) progressText.textContent = '70%';
                    }, 600);
                    
                    setTimeout(() => {
                        if (progressBar) progressBar.style.width = '100%';
                        if (progressText) progressText.textContent = '100%';
                        
                        // Create iframe with proper sandbox attributes to prevent downloads
                        previewContainer.innerHTML = `
                            <div class="preview-wrapper modern-preview">
                                <iframe src="${previewUrl}" title="PDF Preview" 
                                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                                        referrerpolicy="no-referrer-when-downgrade"
                                        style="width: 100%; height: 500px; border: none; border-radius: 12px; opacity: 0; transition: opacity 0.4s ease;"
                                        onload="handlePreviewLoad(this, 'pdf')"
                                        onerror="handlePreviewError(this, '${fileUrl}', 'pdf')"
                                        loading="lazy">
                                </iframe>
                            </div>
                        `;
                    }, 1000);
                    
                } else if (isImageFormat(outputFormat)) {
                    // For images, use direct img loading with preview URL to prevent automatic downloads
                    console.log('Loading image preview to prevent auto-download...');
                    
                    previewContainer.innerHTML = `
                        <div class="preview-wrapper modern-preview">
                            <div class="modern-preview-loading">
                                <div class="modern-spinner"></div>
                                <div class="loading-text">
                                    <h4>Loading ${outputFormat.toUpperCase()} Preview</h4>
                                    <p>Preparing image...</p>
                                    <div class="pulse-loader">
                                        <div class="pulse-dot"></div>
                                        <div class="pulse-dot"></div>
                                        <div class="pulse-dot"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    // Simulate loading for better UX, then show image
                    setTimeout(() => {
                        previewContainer.innerHTML = `
                            <div class="preview-wrapper modern-preview">
                                <img src="${previewUrl}" alt="Converted ${outputFormat.toUpperCase()} Image" 
                                     onload="handlePreviewLoad(this, 'image')"
                                     onerror="handlePreviewError(this, '${fileUrl}', 'image')"
                                     referrerpolicy="no-referrer-when-downgrade"
                                     style="max-width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 12px; 
                                            box-shadow: 0 8px 32px rgba(0,0,0,0.12); opacity: 0; transition: all 0.4s ease; 
                                            transform: scale(0.95);">
                            </div>
                        `;
                    }, 800);
                } else {
                    // Modern generic preview for other formats
                    previewContainer.innerHTML = `
                        <div class="modern-preview-placeholder">
                            <div class="placeholder-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                            </div>
                            <h4>Preview Ready</h4>
                            <p>Preview not available for ${outputFormat.toUpperCase()} format</p>
                            <p class="download-hint">Your file is ready for download</p>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Error in updatePreview:', error);
                // Show error state
                previewContainer.innerHTML = `
                    <div class="modern-preview-placeholder">
                        <div class="placeholder-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                        </div>
                        <h4>Preview Error</h4>
                        <p>Unable to load preview</p>
                        <p class="download-hint">Your file is ready for download</p>
                    </div>
                `;
            }
        }, 300); // Brief delay to show skeleton
        
        // Store the download URL (without preview parameter) for the download button
        convertedFileUrl = fileUrl;
        
        // Add CSS for preview loading state if not already present
        if (!document.getElementById('preview-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'preview-styles';
            styleEl.textContent = `
                .progress-container {
                    margin: 15px 0;
                    width: 100%;
                }
                
                .progress-bar-bg {
                    width: 100%;
                    height: 6px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 3px;
                    overflow: hidden;
                    position: relative;
                }
                
                .progress-bar {
                    height: 100%;
                    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                    border-radius: 3px;
                    transition: width 0.3s ease;
                    position: relative;
                }
                
                .progress-bar::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                    animation: shimmer 1.5s infinite;
                }
                
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                
                .progress-text {
                    display: block;
                    margin-top: 8px;
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.8);
                    text-align: center;
                }
                
                #pdf-loading-status {
                    font-size: 14px;
                    color: rgba(255, 255, 255, 0.9);
                    margin-bottom: 10px;
                }
                
                .preview-wrapper {
                    position: relative;
                    min-height: 200px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--surface-color);
                    border-radius: 8px;
                    overflow: hidden;
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
                    background: rgba(255,255,255,0.95);
                    backdrop-filter: blur(4px);
                    z-index: 1;
                    border-radius: 8px;
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

// Handle preview errors with enhanced reliability}

    // Show skeleton loading for better perceived performance
    function showSkeletonPreview(container, format) {
        if (format === 'pdf' || isImageFormat(format)) {
            container.innerHTML = `
                <div class="skeleton-preview">
                    <div class="skeleton-header">
                        <div class="skeleton-line skeleton-title"></div>
                        <div class="skeleton-line skeleton-subtitle"></div>
                    </div>
                    <div class="skeleton-content ${format === 'pdf' ? 'skeleton-pdf' : 'skeleton-image'}">
                        <div class="skeleton-shimmer"></div>
                    </div>
                    <div class="skeleton-footer">
                        <div class="skeleton-line skeleton-action"></div>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="skeleton-preview">
                    <div class="skeleton-placeholder">
                        <div class="skeleton-icon"></div>
                        <div class="skeleton-line skeleton-title"></div>
                        <div class="skeleton-line skeleton-subtitle"></div>
                    </div>
                </div>
            `;
        }
    }

    // Handle successful preview loading with smooth animations
    function handlePreviewLoad(element, type) {
        console.log(`${type} preview loaded successfully`);
        
        // Complete progress bar for PDF
        if (type === 'pdf' && window.pdfProgressInterval) {
            clearInterval(window.pdfProgressInterval);
            const progressBar = document.getElementById('pdf-progress-bar');
            const progressText = document.getElementById('pdf-progress-text');
            const statusText = document.getElementById('pdf-loading-status');
            
            if (progressBar) progressBar.style.width = '100%';
            if (progressText) progressText.textContent = '100%';
            if (statusText) statusText.textContent = 'Preview ready!';
            
            // Minimal delay to show completion (reduced from 500ms to 100ms)
            setTimeout(() => {
                hideLoadingAndShowContent();
            }, 100);
        } else {
            hideLoadingAndShowContent();
        }
        
        function hideLoadingAndShowContent() {
            // Hide loading overlay
            const loadingOverlay = element.parentNode.querySelector('.modern-preview-loading');
            if (loadingOverlay) {
                loadingOverlay.style.opacity = '0';
                loadingOverlay.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    loadingOverlay.style.display = 'none';
                }, 300);
            }
            
            // Show the actual content with smooth animation
            if (type === 'image') {
                element.style.opacity = '1';
                element.style.transform = 'scale(1)';
            } else if (type === 'pdf') {
                element.style.opacity = '1';
            }
            
            // Add loaded class for additional styling
            element.parentNode.classList.add('preview-loaded');
            
            // Add success micro-interaction
            setTimeout(() => {
                element.parentNode.classList.add('preview-success');
            }, 400);
        }
    }

    function handlePreviewError(element, fileUrl, type) {
        console.log('Preview error occurred:', { element, fileUrl, type });
        
        // Hide the element that failed to load
        element.style.display = 'none';
        
        // Create enhanced error message with retry and download options
        const errorDiv = document.createElement('div');
        errorDiv.className = 'preview-error-message';
        errorDiv.innerHTML = `
            <div class="error-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
            <h4>Preview Unavailable</h4>
            <p>Unable to display ${type}. The file may still be processing or your browser doesn't support this format.</p>
            <div class="error-actions">
                <button class="retry-button" onclick="retryPreview('${fileUrl}', '${type}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <polyline points="1 20 1 14 7 14"></polyline>
                        <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    Retry Preview
                </button>
                <a href="${fileUrl}" download class="download-button">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download File
                </a>
            </div>
        `;
        
        // Find the preview wrapper and append the error message
        const previewWrapper = element.closest('.preview-wrapper') || element.parentNode;
        previewWrapper.appendChild(errorDiv);
        
        // Hide the loading indicator
        const loadingEl = previewWrapper.querySelector('.preview-loading');
        if (loadingEl) loadingEl.style.display = 'none';
        
        // Add error styling to wrapper
        previewWrapper.classList.add('preview-error');
    }

// Retry loading the preview with enhanced reliability
function retryPreview(fileUrl, type) {
        console.log('Retrying preview:', { fileUrl, type });
        
        // Get the preview container
        const previewContainer = document.getElementById('result-preview-container');
        if (!previewContainer) {
            console.error('Result preview container not found');
            return;
        }
        
        // Clear existing content and show loading
        previewContainer.innerHTML = `
            <div class="preview-loading">
                <div class="spinner"></div>
                <p>Retrying preview...</p>
            </div>
        `;
        
        // Wait a moment then retry with cache-busting
        setTimeout(() => {
            if (type === 'pdf') {
                updatePreview('pdf', fileUrl);
            } else if (type === 'image') {
                // Try to determine the actual format or default to jpg
                const format = fileUrl.includes('.png') ? 'png' : 
                             fileUrl.includes('.jpeg') ? 'jpeg' : 'jpg';
                updatePreview(format, fileUrl);
            } else {
                // For other types, try to update with the original type
                updatePreview(type, fileUrl);
            }
        }, 1000);
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
    const conversionGuide = document.getElementById('conversion-guide');
    
    if (uploadContainer) uploadContainer.classList.remove('hidden');
    if (fileProcessing) fileProcessing.classList.add('hidden');
    if (conversionResult) conversionResult.classList.add('hidden');
    if (conversionGuide) conversionGuide.classList.remove('hidden');
    
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
    console.log('🔄 resetConversion called');
    
    // Reset file input completely to allow selecting the same file again
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        // Clone the file input to completely reset it and allow same file selection
        const newFileInput = fileInput.cloneNode(true);
        fileInput.parentNode.replaceChild(newFileInput, fileInput);
        
        // Re-attach the event listener to the new file input
        newFileInput.addEventListener('change', handleFileSelect);
        console.log('✅ File input cloned and reset with event listener reattached');
    }
    
    // Reset current file and URL
    currentFile = null;
    convertedFileUrl = null;
    
    // Hide result and processing sections
    const fileProcessing = document.getElementById('file-processing');
    const conversionResult = document.getElementById('conversion-result');
    const conversionGuide = document.getElementById('conversion-guide');
    
    if (fileProcessing) fileProcessing.classList.add('hidden');
    if (conversionResult) conversionResult.classList.add('hidden');
    if (conversionGuide) conversionGuide.classList.remove('hidden');
    
    // Hide conversion modal if open
    const conversionModal = document.getElementById('conversion-modal');
    if (conversionModal) {
        conversionModal.classList.add('hidden');
        conversionModal.classList.remove('show');
    }
    
    // Hide unified modal if open
    const unifiedModal = document.getElementById('unified-conversion-modal');
    if (unifiedModal) {
        unifiedModal.classList.add('hidden');
        unifiedModal.classList.remove('show');
        document.body.style.overflow = ''; // Restore scroll
    }
    
    // Show upload container and reset its state completely
    const uploadContainer = document.getElementById('upload-container');
    if (uploadContainer) {
        uploadContainer.classList.remove('hidden', 'file-uploaded', 'loading');
        
        // Remove any loading elements that might be stuck
        const loadingDiv = uploadContainer.querySelector('.upload-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }
    
    // Reset file display elements
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    if (fileName) fileName.textContent = '';
    if (fileSize) fileSize.textContent = '';
    
    // Reset advanced options
    const ocrOption = document.getElementById('ocr-option');
    const compressionLevel = document.getElementById('compression-level');
    if (ocrOption) ocrOption.checked = false;
    if (compressionLevel) compressionLevel.value = 'medium';
    
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
    
    // Reset convert button state
    resetConvertButton();
    
    // Clear any progress intervals
    if (window.conversionProgressInterval) {
        clearInterval(window.conversionProgressInterval);
        window.conversionProgressInterval = null;
    }
    
    // Scroll back to home section for professional UX
    setTimeout(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
    }, 100); // Small delay to ensure DOM updates are complete
    
    console.log('✅ resetConversion completed');
}

// Close conversion modal
function closeConversionModal() {
    const conversionModal = document.getElementById('conversion-modal');
    if (conversionModal) {
        conversionModal.classList.add('hidden');
        conversionModal.classList.remove('show');
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
                max-width: 350px;
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
    const conversionOptions = document.querySelector('.conversion-options');
    
    if (!conversionOptions) {
        console.warn('Conversion options element not found');
        return;
    }
    
    // Add visual feedback with a subtle highlight effect
    conversionOptions.style.transition = 'box-shadow 0.3s ease';
    conversionOptions.style.boxShadow = '0 0 20px rgba(74, 144, 226, 0.3)';
    
    // Scroll with retry mechanism for better reliability
    let attempts = 0;
    const maxAttempts = 3;
    
    function attemptScroll() {
        attempts++;
        
        // Check if element is visible
        const rect = conversionOptions.getBoundingClientRect();
        const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
        
        if (!isVisible || attempts <= maxAttempts) {
            conversionOptions.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });
            
            // Retry if needed
            if (!isVisible && attempts < maxAttempts) {
                setTimeout(attemptScroll, 300);
            }
        }
    }
    
    attemptScroll();
    
    // Remove highlight effect after scroll
    setTimeout(() => {
        conversionOptions.style.boxShadow = '';
        conversionOptions.style.transition = '';
    }, 1000);
    
    console.log('✅ Scrolled to conversion options with visual feedback');
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

// Unified Modal Functions
function showUnifiedModal() {
    console.log('🎭 showUnifiedModal called');
    const modal = document.getElementById('unified-conversion-modal');
    console.log('🔍 Modal element found:', modal);
    
    if (modal) {
        console.log('✅ Modal exists, showing it...');
        
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        
        // Ensure modal is properly positioned as overlay
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.zIndex = '10001';
        
        // Show the modal with smooth transition
        modal.classList.remove('hidden');
        
        // Force a reflow to ensure the transition works
        modal.offsetHeight;
        
        modal.classList.add('show');
        console.log('📱 Modal classes after show:', modal.className);
        
        // Ensure processing state is visible and result state is hidden
        const processingState = document.getElementById('processing-state');
        const resultState = document.getElementById('result-state');
        
        console.log('🔍 Processing state element:', processingState);
        console.log('🔍 Result state element:', resultState);
        
        if (processingState) {
            processingState.classList.remove('hidden');
            console.log('📱 Processing state classes:', processingState.className);
        } else {
            console.error('❌ Processing state element not found!');
        }
        
        if (resultState) {
            resultState.classList.add('hidden');
            resultState.classList.remove('show');
            console.log('📱 Result state classes:', resultState.className);
        } else {
            console.error('❌ Result state element not found!');
        }
        
        // Auto-scroll to ensure modal is visible (in case of mobile or small screens)
        setTimeout(() => {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'smooth'
            });
        }, 100);
        
        console.log('✅ Modal should now be visible as overlay');
    } else {
        console.error('❌ Modal element not found!');
    }
}

function closeUnifiedModal() {
    const modal = document.getElementById('unified-conversion-modal');
    if (modal) {
        // Restore body scroll
        document.body.style.overflow = '';
        
        modal.classList.add('hidden');
        modal.classList.remove('show');
        
        // Reset modal states
        const processingState = document.getElementById('processing-state');
        const resultState = document.getElementById('result-state');
        
        if (processingState) {
            processingState.classList.remove('hidden', 'fade-out');
            // Clear any inline styles that might have been set
            processingState.style.opacity = '';
            processingState.style.transform = '';
        }
        if (resultState) {
            resultState.classList.add('hidden');
            resultState.classList.remove('show');
            // Clear any inline styles that might have been set
            resultState.style.opacity = '';
            resultState.style.transform = '';
        }
        
        // Clear any progress intervals
        if (window.conversionProgressInterval) {
            clearInterval(window.conversionProgressInterval);
        }
        
        // Reset convert button state
        resetConvertButton();
    }
}

// Function to reset the convert button to its original state
function resetConvertButton() {
    const convertBtn = document.getElementById('convert-btn');
    if (convertBtn) {
        convertBtn.disabled = false;
        convertBtn.innerHTML = 'Convert Now';
    }
}

function transitionToResultState() {
    const processingState = document.getElementById('processing-state');
    const resultState = document.getElementById('result-state');
    
    if (processingState && resultState) {
        // Use CSS classes for smooth transitions instead of inline styles
        processingState.classList.add('fade-out');
        
        setTimeout(() => {
            processingState.classList.add('hidden');
            processingState.classList.remove('fade-out');
            
            // Show result state with CSS animation
            resultState.classList.remove('hidden');
            
            // Force reflow to ensure the element is visible before animation
            resultState.offsetHeight;
            
            resultState.classList.add('show');
        }, 300);
    }
}

// Modern instant download with progress tracking
async function handleInstantDownload(fileUrl) {
    console.log('🔄 Starting download process for URL:', fileUrl);
    console.log('📋 Current fileUrl type:', typeof fileUrl);
    console.log('📋 Current fileUrl value:', fileUrl);
    
    const downloadBtn = document.getElementById('result-download-btn');
    if (!downloadBtn) {
        console.error('❌ Download button not found!');
        return;
    }
    
    console.log('✅ Download button found:', downloadBtn);
    console.log('📋 Button current state:', {
        innerHTML: downloadBtn.innerHTML,
        disabled: downloadBtn.disabled,
        className: downloadBtn.className
    });
    
    try {
        // Show preparation state briefly
        showDownloadPreparation(downloadBtn);
        
        // Get session ID for authentication
        const sessionId = window.sessionId || window.currentSessionId;
        console.log('🔑 Session ID for download:', sessionId);
        
        // Prepare download URL with session_id and download=true parameters
        let downloadUrl = fileUrl;
        
        // Add session_id parameter
        if (sessionId) {
            downloadUrl = fileUrl.includes('?') ? 
                `${fileUrl}&session_id=${sessionId}` : 
                `${fileUrl}?session_id=${sessionId}`;
        }
        
        // Add download=true parameter
        downloadUrl = downloadUrl.includes('?') ? 
            `${downloadUrl}&download=true` : 
            `${downloadUrl}?download=true`;
            
        console.log('🔗 Final download URL:', downloadUrl);
        
        // Use the same simple approach as admin interface
        console.log('🚀 Attempting to open download URL in new window...');
        const newWindow = window.open(downloadUrl, '_blank');
        console.log('🪟 New window object:', newWindow);
        
        // Show success state after a brief delay
        setTimeout(() => {
            console.log('✅ Download initiated successfully');
            showDownloadSuccess(downloadBtn);
        }, 500);
        
    } catch (error) {
        console.error('❌ Download failed:', error);
        console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack
        });
        showDownloadError(downloadBtn);
    }
}

// Show download preparation state
function showDownloadPreparation(button) {
    // Don't overwrite originalContent if it's already set
    if (!button.dataset.originalContent) {
        button.dataset.originalContent = button.innerHTML;
    }
    
    button.innerHTML = `
        <div class="download-preparing">
            <div class="modern-spinner small"></div>
            <span>Preparing...</span>
        </div>
    `;
    button.disabled = true;
    button.classList.add('preparing');
}







// Show download success state
function showDownloadSuccess(button) {
    console.log('🎉 showDownloadSuccess called for button:', button);
    console.log('📋 Button current state before success:', {
        innerHTML: button.innerHTML,
        classList: Array.from(button.classList),
        disabled: button.disabled
    });
    
    button.innerHTML = `
        <div class="download-success">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5"></path>
            </svg>
            <span>Downloaded!</span>
        </div>
    `;
    
    button.classList.remove('downloading', 'preparing');
    button.classList.add('success');
    button.disabled = false;
    
    console.log('✅ Button updated to success state:', {
        innerHTML: button.innerHTML,
        classList: Array.from(button.classList),
        disabled: button.disabled
    });
    
    // Reset button after 5 seconds (increased from 3)
    setTimeout(() => {
        console.log('⏰ Resetting download button after success timeout');
        resetDownloadButton(button);
    }, 5000);
}

// Show download error state
function showDownloadError(button) {
    button.innerHTML = `
        <div class="download-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <span>Error</span>
        </div>
    `;
    
    button.classList.remove('downloading', 'preparing');
    button.classList.add('error');
    
    // Reset button after 3 seconds
    setTimeout(() => {
        resetDownloadButton(button);
    }, 3000);
}

// Reset download button to original state
function resetDownloadButton(button) {
    console.log('🔄 resetDownloadButton called for button:', button);
    console.log('📋 Button state before reset:', {
        innerHTML: button.innerHTML,
        classList: Array.from(button.classList),
        disabled: button.disabled,
        originalContent: button.dataset.originalContent
    });
    
    const originalContent = button.dataset.originalContent;
    if (originalContent) {
        button.innerHTML = originalContent;
    }
    
    button.disabled = false;
    button.classList.remove('preparing', 'downloading', 'success', 'error');
    // Don't delete originalContent so button can be used multiple times
    
    console.log('✅ Button reset completed:', {
        innerHTML: button.innerHTML,
        classList: Array.from(button.classList),
        disabled: button.disabled
    });
}

// Handle file selection from input
function handleFileSelect(event) {
    const files = event.target.files;
    if (files && files.length > 0) {
        const file = files[0];
        console.log('📁 File selected:', file.name, 'Size:', formatFileSize(file.size));
        
        // Store the selected file
        currentFile = file;
        
        // Show file info and enable conversion
        displaySelectedFile(file);
        
        // Don't automatically show modal - let user choose format first
        console.log('✅ File ready for conversion - user can now select output format');
    }
}

// Display selected file information
function displaySelectedFile(file) {
    const uploadContainer = document.getElementById('upload-container');
    const fileProcessing = document.getElementById('file-processing');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    
    if (fileName) fileName.textContent = file.name;
    if (fileSize) fileSize.textContent = formatFileSize(file.size);
    
    if (uploadContainer) {
        uploadContainer.classList.add('file-uploaded');
    }
    
    // Show the file processing section with format selection and convert button
    if (fileProcessing) {
        fileProcessing.classList.remove('hidden');
    }
    
    // Load AI format suggestion
    loadAIFormatSuggestion(file);
    
    // Scroll to conversion options with delay to allow users to see the upload animation
    setTimeout(() => {
        scrollToConversionOptions();
    }, 800);
    
    console.log('✅ File displayed:', file.name);
}

// Handle drag and drop functionality
function setupDragAndDrop() {
    const uploadContainer = document.getElementById('upload-container');
    const fileInput = document.getElementById('file-input');
    
    if (!uploadContainer || !fileInput) return;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadContainer.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadContainer.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadContainer.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    uploadContainer.addEventListener('drop', handleDrop, false);
    
    // Handle click to select files
    uploadContainer.addEventListener('click', () => {
        fileInput.click();
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight(e) {
        uploadContainer.classList.add('dragover');
    }
    
    function unhighlight(e) {
        uploadContainer.classList.remove('dragover');
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files && files.length > 0) {
            const file = files[0];
            console.log('📁 File dropped:', file.name);
            
            // Store the selected file
            currentFile = file;
            
            // Display file info
            displaySelectedFile(file);
            
            // Don't automatically show modal - let user choose format first
            console.log('✅ File ready for conversion - user can now select output format');
        }
    }
}

// Upload and convert file function
async function uploadAndConvertFile(outputFormat) {
    if (!currentFile) {
        showNotification('Please select a file first', 'warning');
        return;
    }
    
    console.log('🚀 Starting upload and conversion process...');
    
    try {
        // Show upload loading
        showUploadLoading();
        
        // Step 1: Upload the file
        console.log('📤 Uploading file...');
        const formData = new FormData();
        formData.append('file', currentFile);
        
        // Generate or get session ID
        let sessionId = window.sessionId;
        if (!sessionId) {
            sessionId = generateSessionId();
            window.sessionId = sessionId;
        }
        formData.append('sessionId', sessionId);
        
        const uploadResponse = await fetch(`${window.API_BASE_URL}/upload/public`, {
            method: 'POST',
            body: formData
        });
        
        const uploadResult = await uploadResponse.json();
        
        if (!uploadResponse.ok || !uploadResult.success) {
            throw new Error(uploadResult.error || 'File upload failed');
        }
        
        console.log('✅ File uploaded successfully:', uploadResult);
        
        // Step 2: Convert the file
        console.log('🔄 Converting file...');
        const convertData = {
            fileId: uploadResult.fileId,
            outputFormat: outputFormat,
            sessionId: uploadResult.sessionId,
            options: window.conversionOptions || {}
        };
        
        const convertResponse = await fetch(`${window.API_BASE_URL}/convert/public`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(convertData)
        });
        
        const convertResult = await convertResponse.json();
        
        if (convertResponse.ok && convertResult.success) {
            console.log('✅ Conversion successful:', convertResult);
            
            // Hide upload loading
            hideUploadLoading();
            
            // Show the unified modal first
            showUnifiedModal();
            
            // Then show conversion result within the modal
            showConversionResult(convertResult, outputFormat);
            
        } else {
            throw new Error(convertResult.error || 'Conversion failed');
        }
        
    } catch (error) {
        console.error('❌ Upload/conversion error:', error);
        hideUploadLoading();
        showDetailedError(error.message, outputFormat);
    }
}

// Show conversion result in the unified modal
function showConversionResult(result, outputFormat) {
    console.log('🎉 Showing conversion result in modal:', result);
    console.log('📋 Result object keys:', Object.keys(result));
    console.log('📋 Result downloadUrl:', result.downloadUrl);
    console.log('📋 Result downloadUrl type:', typeof result.downloadUrl);
    
    // Store the converted file URL globally (backend returns 'downloadUrl')
    window.convertedFileUrl = result.downloadUrl;
    console.log('🌐 Stored global convertedFileUrl:', window.convertedFileUrl);
    
    // Update the result preview within the modal
    updateResultPreview(outputFormat, result.downloadUrl);
    
    // Set up download button functionality
    setupResultDownloadButton(result.downloadUrl, outputFormat);
    
    // Set up new conversion button
    setupNewConversionButton();
    
    // Set up modal close button
    setupModalCloseButton();
    
    // Transition from processing state to result state within the modal
    transitionToResultState();
    
    console.log('✅ Result state transition completed');
}

// Update the result preview within the modal
function updateResultPreview(outputFormat, fileUrl) {
    const previewContainer = document.getElementById('result-preview-container');
    if (!previewContainer) return;
    
    // Clear existing preview
    previewContainer.innerHTML = '';
    
    // Show preview of the original selected file, not the converted file
    if (currentFile) {
        // Check if original file is an image
        if (currentFile.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(currentFile);
            img.alt = 'Original file preview';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '300px';
            img.style.objectFit = 'contain';
            img.style.borderRadius = '8px';
            
            // Clean up object URL when image loads
            img.onload = function() {
                URL.revokeObjectURL(img.src);
            };
            
            previewContainer.appendChild(img);
        } else if (currentFile.type === 'application/pdf') {
            // For PDF files, show a PDF icon with file info
            const filePreview = document.createElement('div');
            filePreview.className = 'file-preview-placeholder';
            filePreview.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #ef4444; margin-bottom: 1rem;">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <p style="margin: 0; color: #64748b; font-weight: 500;">${currentFile.name}</p>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; color: #94a3b8;">Converted to ${outputFormat.toUpperCase()}</p>
                </div>
            `;
            previewContainer.appendChild(filePreview);
        } else {
            // For other file types, show a generic file icon with file info
            const filePreview = document.createElement('div');
            filePreview.className = 'file-preview-placeholder';
            filePreview.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #6366f1; margin-bottom: 1rem;">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <p style="margin: 0; color: #64748b; font-weight: 500;">${currentFile.name}</p>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; color: #94a3b8;">Converted to ${outputFormat.toUpperCase()}</p>
                </div>
            `;
            previewContainer.appendChild(filePreview);
        }
    } else {
        // Fallback if no current file
        const filePreview = document.createElement('div');
        filePreview.className = 'file-preview-placeholder';
        filePreview.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #6366f1; margin-bottom: 1rem;">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <p style="margin: 0; color: #64748b;">File converted to ${outputFormat.toUpperCase()}</p>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; color: #94a3b8;">Click download to save your file</p>
            </div>
        `;
        previewContainer.appendChild(filePreview);
    }
}

// Set up download button functionality
function setupResultDownloadButton(downloadUrl, outputFormat) {
    console.log('🔧 Setting up download button with URL:', downloadUrl);
    console.log('📋 Download URL type:', typeof downloadUrl);
    console.log('📋 Download URL value:', downloadUrl);
    console.log('📋 Output format:', outputFormat);
    
    const downloadBtn = document.getElementById('result-download-btn');
    if (!downloadBtn) {
        console.error('❌ Download button not found in setupResultDownloadButton!');
        return;
    }
    
    console.log('✅ Download button found in setup:', downloadBtn);
    console.log('📋 Current button innerHTML:', downloadBtn.innerHTML);
    console.log('📋 Button element:', downloadBtn);
    
    // Store original content for reset functionality
    downloadBtn.dataset.originalContent = downloadBtn.innerHTML;
    console.log('💾 Stored original content:', downloadBtn.dataset.originalContent);
    
    downloadBtn.onclick = async function() {
        console.log('🖱️ Download button clicked! Starting download...');
        console.log('🔗 About to download URL:', downloadUrl);
        await handleInstantDownload(downloadUrl);
    };
    
    console.log('✅ Click handler attached to download button');
    console.log('🎯 Setup complete for download URL:', downloadUrl);
}

// Set up new conversion button
function setupNewConversionButton() {
    const newConversionBtn = document.getElementById('result-new-conversion-btn');
    if (!newConversionBtn) return;
    
    newConversionBtn.onclick = function() {
        // Close the modal
        closeUnifiedModal();
        
        // Reset the page to home state
        resetPageToHome();
        
        // Reset conversion state
        resetConversion();
    };
}

// Set up modal close button
function setupModalCloseButton() {
    const closeBtn = document.getElementById('unified-modal-close-btn');
    if (!closeBtn) return;
    
    closeBtn.onclick = function() {
        closeUnifiedModal();
    };
    
    // Also handle backdrop clicks
    const modal = document.getElementById('unified-conversion-modal');
    const modalContainer = document.querySelector('.unified-modal-container');
    
    if (modal && modalContainer) {
        modal.onclick = function(e) {
            if (e.target === modal) {
                closeUnifiedModal();
            }
        };
        
        // Prevent clicks inside the modal container from closing the modal
        modalContainer.onclick = function(e) {
            e.stopPropagation();
        };
    }
    
    // Handle ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('unified-conversion-modal');
            if (modal && !modal.classList.contains('hidden')) {
                closeUnifiedModal();
            }
        }
    });
}

// Reset conversion state
function resetConversion() {
    // Clear global variables
    window.convertedFileUrl = null;
    window.currentFileId = null;
    window.currentSessionId = null;
    
    // Reset file input
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.value = '';
    }
    
    // Reset output format selector
    const outputFormatSelect = document.getElementById('output-format');
    if (outputFormatSelect) {
        outputFormatSelect.value = 'pdf';
    }
    
    // Hide AI suggestion
    const aiSuggestion = document.getElementById('ai-suggestion');
    if (aiSuggestion) {
        aiSuggestion.style.display = 'none';
    }
    
    // Clear any preview containers
    const previewContainer = document.getElementById('result-preview-container');
    if (previewContainer) {
        previewContainer.innerHTML = '';
    }
    
    // Reset modal states
    const modal = document.getElementById('unified-conversion-modal');
    const processingState = document.getElementById('processing-state');
    const resultState = document.getElementById('result-state');
    
    if (modal) modal.classList.add('hidden');
    if (processingState) processingState.classList.remove('hidden');
    if (resultState) resultState.classList.add('hidden');
    
    console.log('🔄 Conversion state reset');
}

// AI Format Suggestion functionality
async function loadAIFormatSuggestion(file) {
    const aiSuggestionContainer = document.getElementById('ai-suggestion');
    const aiSuggestionContent = aiSuggestionContainer?.querySelector('.ai-suggestion-content');
    const aiSuggestionLoading = aiSuggestionContainer?.querySelector('.ai-suggestion-loading');
    
    if (!aiSuggestionContainer) {
        console.warn('AI suggestion container not found');
        return;
    }
    
    try {
        // Show loading state
        if (aiSuggestionLoading) {
            aiSuggestionLoading.style.display = 'block';
        }
        if (aiSuggestionContent) {
            aiSuggestionContent.style.display = 'none';
        }
        aiSuggestionContainer.style.display = 'block';
        
        // Get file extension and type
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const fileType = file.type;
        
        console.log('🤖 Getting AI format suggestion for:', fileExtension, fileType);
        
        // Call the API to get conversion capabilities
        const response = await fetch(`${window.API_BASE_URL}/conversion/capabilities`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayAISuggestionFromCapabilities(data, fileExtension);
        } else {
            // Fallback to basic suggestion based on file type
            displayBasicSuggestion(fileExtension, fileType);
        }
        
    } catch (error) {
        console.error('❌ Error loading AI suggestion:', error);
        // Fallback to basic suggestion
        displayBasicSuggestion(file.name.split('.').pop().toLowerCase(), file.type);
    } finally {
        // Hide loading state
        if (aiSuggestionLoading) {
            aiSuggestionLoading.style.display = 'none';
        }
        if (aiSuggestionContent) {
            aiSuggestionContent.style.display = 'block';
        }
    }
}

function displayAISuggestionFromCapabilities(data, inputFormat) {
    const aiSuggestionContent = document.querySelector('.ai-suggestion-content');
    if (!aiSuggestionContent) return;
    
    let suggestionHTML = '';
    
    // Extract available output formats for the input format from conversion matrix
    if (data.conversionMatrix && data.conversionMatrix[inputFormat]) {
        const availableFormats = Object.keys(data.conversionMatrix[inputFormat]).filter(format => 
            data.conversionMatrix[inputFormat][format] === true
        );
        
        if (availableFormats.length > 0) {
            // Get smart suggestions based on format type
            const smartSuggestions = getSmartSuggestions(inputFormat, availableFormats);
            
            if (smartSuggestions.length > 0) {
                const topSuggestion = smartSuggestions[0];
                suggestionHTML = `
                    <div class="ai-suggestion-item">
                        <div class="suggestion-icon">🎯</div>
                        <div class="suggestion-text">
                            <strong>Recommended:</strong> Convert to <span class="format-highlight">${topSuggestion.format.toUpperCase()}</span>
                            <div class="suggestion-reason">${topSuggestion.reason}</div>
                        </div>
                        <button class="suggestion-apply-btn" onclick="applySuggestion('${topSuggestion.format}')">
                            Apply
                        </button>
                    </div>
                `;
                
                if (smartSuggestions.length > 1) {
                    suggestionHTML += `
                        <div class="other-suggestions">
                            <span class="other-label">Other options:</span>
                            ${smartSuggestions.slice(1, 3).map(s => 
                                `<span class="other-format" onclick="applySuggestion('${s.format}')">${s.format.toUpperCase()}</span>`
                            ).join('')}
                        </div>
                    `;
                }
            } else {
                // Show available formats
                suggestionHTML = `
                    <div class="ai-suggestion-item">
                        <div class="suggestion-icon">📄</div>
                        <div class="suggestion-text">
                            <strong>Available formats:</strong> ${availableFormats.slice(0, 3).map(f => f.toUpperCase()).join(', ')}
                        </div>
                    </div>
                `;
            }
        } else {
            displayBasicSuggestion(inputFormat);
            return;
        }
    } else {
        // Fallback to basic suggestion
        displayBasicSuggestion(inputFormat);
        return;
    }
    
    aiSuggestionContent.innerHTML = suggestionHTML;
}

function displayAISuggestion(data, inputFormat) {
    const aiSuggestionContent = document.querySelector('.ai-suggestion-content');
    if (!aiSuggestionContent) return;
    
    let suggestionHTML = '';
    
    if (data.success && data.suggestions && data.suggestions.length > 0) {
        const topSuggestion = data.suggestions[0];
        suggestionHTML = `
            <div class="ai-suggestion-item">
                <div class="suggestion-icon">🎯</div>
                <div class="suggestion-text">
                    <strong>Recommended:</strong> Convert to <span class="format-highlight">${topSuggestion.format.toUpperCase()}</span>
                    <div class="suggestion-reason">${topSuggestion.reason || 'Best format for your file type'}</div>
                </div>
                <button class="suggestion-apply-btn" onclick="applySuggestion('${topSuggestion.format}')">
                    Apply
                </button>
            </div>
        `;
        
        if (data.suggestions.length > 1) {
            suggestionHTML += `
                <div class="other-suggestions">
                    <span class="other-label">Other options:</span>
                    ${data.suggestions.slice(1, 3).map(s => 
                        `<span class="other-format" onclick="applySuggestion('${s.format}')">${s.format.toUpperCase()}</span>`
                    ).join('')}
                </div>
            `;
        }
    } else {
        // Fallback suggestion
        displayBasicSuggestion(inputFormat);
        return;
    }
    
    aiSuggestionContent.innerHTML = suggestionHTML;
}

function displayBasicSuggestion(inputFormat, fileType = '') {
    const aiSuggestionContent = document.querySelector('.ai-suggestion-content');
    if (!aiSuggestionContent) return;
    
    // Basic format suggestions based on input format
    const suggestions = getBasicFormatSuggestions(inputFormat, fileType);
    
    if (suggestions.length > 0) {
        const topSuggestion = suggestions[0];
        const suggestionHTML = `
            <div class="ai-suggestion-item">
                <div class="suggestion-icon">💡</div>
                <div class="suggestion-text">
                    <strong>Suggested:</strong> Convert to <span class="format-highlight">${topSuggestion.format.toUpperCase()}</span>
                    <div class="suggestion-reason">${topSuggestion.reason}</div>
                </div>
                <button class="suggestion-apply-btn" onclick="applySuggestion('${topSuggestion.format}')">
                    Apply
                </button>
            </div>
            ${suggestions.length > 1 ? `
                <div class="other-suggestions">
                    <span class="other-label">Other options:</span>
                    ${suggestions.slice(1, 3).map(s => 
                        `<span class="other-format" onclick="applySuggestion('${s.format}')">${s.format.toUpperCase()}</span>`
                    ).join('')}
                </div>
            ` : ''}
        `;
        
        aiSuggestionContent.innerHTML = suggestionHTML;
    } else {
        aiSuggestionContent.innerHTML = `
            <div class="ai-suggestion-item">
                <div class="suggestion-icon">📄</div>
                <div class="suggestion-text">
                    <strong>Ready to convert:</strong> Choose your preferred output format below
                </div>
            </div>
        `;
    }
}

function getSmartSuggestions(inputFormat, availableFormats) {
    const suggestions = [];
    
    // Priority suggestions based on input format and available options
    const formatPriorities = {
        // Image formats
        'jpg': ['pdf', 'png', 'webp'],
        'jpeg': ['pdf', 'png', 'webp'],
        'png': ['pdf', 'jpg', 'webp'],
        'gif': ['pdf', 'png', 'jpg'],
        'bmp': ['pdf', 'png', 'jpg'],
        'tiff': ['pdf', 'png', 'jpg'],
        'webp': ['pdf', 'png', 'jpg'],
        
        // Document formats
        'doc': ['pdf', 'docx', 'txt'],
        'docx': ['pdf', 'txt', 'html'],
        'odt': ['pdf', 'docx', 'txt'],
        'rtf': ['pdf', 'docx', 'txt'],
        
        // PDF
        'pdf': ['docx', 'txt', 'jpg'],
        
        // Spreadsheet formats
        'xls': ['pdf', 'xlsx', 'csv'],
        'xlsx': ['pdf', 'csv', 'html'],
        'ods': ['pdf', 'xlsx', 'csv'],
        'csv': ['pdf', 'xlsx', 'html'],
        
        // Presentation formats
        'ppt': ['pdf', 'pptx', 'jpg'],
        'pptx': ['pdf', 'jpg', 'png'],
        'odp': ['pdf', 'pptx', 'jpg'],
        
        // Text formats
        'txt': ['pdf', 'docx', 'html'],
        'md': ['pdf', 'html', 'docx'],
        'html': ['pdf', 'txt', 'docx'],
        'xml': ['pdf', 'txt', 'html']
    };
    
    const reasons = {
        'pdf': 'Universal format, preserves formatting',
        'docx': 'Editable Word document',
        'txt': 'Plain text, maximum compatibility',
        'html': 'Web-friendly format',
        'png': 'High quality with transparency',
        'jpg': 'Smaller file size, good for photos',
        'webp': 'Modern web format, smaller size',
        'csv': 'Universal data exchange format',
        'xlsx': 'Modern Excel format'
    };
    
    const priorities = formatPriorities[inputFormat] || ['pdf', 'txt'];
    
    // Add suggestions based on priority and availability
    priorities.forEach(format => {
        if (availableFormats.includes(format) && format !== inputFormat) {
            suggestions.push({
                format: format,
                reason: reasons[format] || `Convert to ${format.toUpperCase()}`
            });
        }
    });
    
    // Add any remaining available formats
    availableFormats.forEach(format => {
        if (format !== inputFormat && !suggestions.find(s => s.format === format)) {
            suggestions.push({
                format: format,
                reason: reasons[format] || `Convert to ${format.toUpperCase()}`
            });
        }
    });
    
    return suggestions.slice(0, 4); // Return top 4 suggestions
}

function getBasicFormatSuggestions(inputFormat, fileType) {
    const suggestions = [];
    
    // Image formats
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'].includes(inputFormat)) {
        suggestions.push(
            { format: 'pdf', reason: 'Perfect for documents and sharing' },
            { format: 'png', reason: 'High quality with transparency support' },
            { format: 'jpg', reason: 'Smaller file size, good for photos' }
        );
    }
    // Document formats
    else if (['doc', 'docx', 'odt', 'rtf'].includes(inputFormat)) {
        suggestions.push(
            { format: 'pdf', reason: 'Universal format, preserves formatting' },
            { format: 'txt', reason: 'Plain text, maximum compatibility' },
            { format: 'html', reason: 'Web-friendly format' }
        );
    }
    // PDF
    else if (inputFormat === 'pdf') {
        suggestions.push(
            { format: 'docx', reason: 'Editable Word document' },
            { format: 'txt', reason: 'Extract text content' },
            { format: 'jpg', reason: 'Convert to images' }
        );
    }
    // Spreadsheet formats
    else if (['xls', 'xlsx', 'ods', 'csv'].includes(inputFormat)) {
        suggestions.push(
            { format: 'pdf', reason: 'Professional presentation format' },
            { format: 'csv', reason: 'Universal data exchange format' },
            { format: 'xlsx', reason: 'Modern Excel format' }
        );
    }
    // Presentation formats
    else if (['ppt', 'pptx', 'odp'].includes(inputFormat)) {
        suggestions.push(
            { format: 'pdf', reason: 'Share presentations easily' },
            { format: 'jpg', reason: 'Convert slides to images' },
            { format: 'png', reason: 'High-quality slide images' }
        );
    }
    // Text formats
    else if (['txt', 'md', 'html', 'xml'].includes(inputFormat)) {
        suggestions.push(
            { format: 'pdf', reason: 'Professional document format' },
            { format: 'docx', reason: 'Rich text editing capabilities' },
            { format: 'html', reason: 'Web-compatible format' }
        );
    }
    // Default suggestions
    else {
        suggestions.push(
            { format: 'pdf', reason: 'Universal document format' },
            { format: 'txt', reason: 'Plain text extraction' }
        );
    }
    
    return suggestions.filter(s => s.format !== inputFormat); // Don't suggest same format
}

function applySuggestion(format) {
    const outputFormatSelect = document.getElementById('output-format');
    if (outputFormatSelect) {
        outputFormatSelect.value = format;
        
        // Trigger change event to update any dependent UI
        const changeEvent = new Event('change', { bubbles: true });
        outputFormatSelect.dispatchEvent(changeEvent);
        
        // Show visual feedback
        showNotification(`Format set to ${format.toUpperCase()}`, 'success');
        
        // Scroll to conversion options
        setTimeout(() => {
            scrollToConversionOptions();
        }, 300);
    }
}

// Initialize upload functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Initializing upload functionality...');
    
    // Force scroll to top on page load
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Reset upload container to clean state
    resetConversion();
    
    // Set up file input event listener
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
        console.log('✅ File input event listener attached');
    }
    
    // Set up drag and drop
    setupDragAndDrop();
    console.log('✅ Drag and drop functionality initialized');
    
    // Set up file select button
    const fileSelectBtn = document.getElementById('file-select-btn');
    if (fileSelectBtn) {
        fileSelectBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (fileInput) {
                fileInput.click();
            }
        });
        console.log('✅ File select button event listener attached');
    }
    
    // Set up convert button event listener
    const convertBtn = document.getElementById('convert-btn');
    if (convertBtn) {
        convertBtn.addEventListener('click', handleConversionWithOptions);
        console.log('✅ Convert button event listener attached');
    } else {
        console.log('❌ Convert button element not found!');
    }
});

// Handle browser navigation and page refresh
window.addEventListener('load', function() {
    // Force scroll to top on window load
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
});

// Handle browser back/forward navigation
window.addEventListener('pageshow', function(event) {
    // Force scroll to top when page is shown (including back/forward navigation)
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
});

// Prevent scroll restoration by browser
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}