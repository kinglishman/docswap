const fs = require('fs');
const path = require('path');
const os = require('os');
const { getFileMetadata, updateFileConversion } = require('../supabase-client');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Supported conversions
const SUPPORTED_CONVERSIONS = {
  'pdf': ['txt', 'docx'],
  'txt': ['pdf', 'docx'],
  'docx': ['pdf', 'txt'],
  'doc': ['pdf', 'txt', 'docx'],
  'jpg': ['pdf', 'png'],
  'jpeg': ['pdf', 'png'],
  'png': ['pdf', 'jpg'],
  'gif': ['pdf', 'png'],
  'bmp': ['pdf', 'png'],
  'tiff': ['pdf', 'png'],
  'webp': ['pdf', 'png']
};

function getSupportedConversions() {
  return SUPPORTED_CONVERSIONS;
}



module.exports = async (req, res) => {
  // Set CORS headers
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key]);
  });

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    // Return supported conversions
    return res.status(200).json({
      success: true,
      supported_conversions: getSupportedConversions()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileId, outputFormat, sessionId } = req.body;

    if (!fileId || !outputFormat || !sessionId) {
      return res.status(400).json({ 
        error: 'Missing required parameters: fileId, outputFormat, sessionId' 
      });
    }

    // Get file metadata from session
    const fileMetadata = await getFileMetadata(sessionId, fileId);
    if (!fileMetadata) {
      return res.status(404).json({ 
        error: 'File not found or session expired' 
      });
    }

    // Extract input format from file extension
    const inputExtension = fileMetadata.fileExtension.substring(1).toLowerCase(); // Remove the dot
    
    // Check if conversion is supported
    if (!SUPPORTED_CONVERSIONS[inputExtension] || 
        !SUPPORTED_CONVERSIONS[inputExtension].includes(outputFormat)) {
      return res.status(400).json({ 
        error: `Conversion from ${inputExtension} to ${outputFormat} is not supported` 
      });
    }

    // For demo purposes, simulate successful conversion
    // In a full implementation, this would trigger actual conversion logic
    const conversionId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create a simple converted file for demo
    const convertedFileName = `${fileMetadata.baseName}_converted.${outputFormat}`;
    const convertedContent = `This is a demo converted file from ${inputExtension} to ${outputFormat}.\n\nOriginal file: ${fileMetadata.originalFilename}\nFile size: ${fileMetadata.fileSize} bytes\nConverted on: ${new Date().toISOString()}`;
    
    // Save converted file to temp directory
    const convertedFilePath = path.join(os.tmpdir(), `${conversionId}_${convertedFileName}`);
    fs.writeFileSync(convertedFilePath, convertedContent);
    
    // Update session with conversion info
    const conversionData = {
      conversionId,
      outputFormat,
      convertedFileName,
      convertedFilePath,
      status: 'completed',
      createdAt: new Date().toISOString()
    };
    
    await updateFileConversion(sessionId, fileId, conversionData);
    
    res.status(200).json({
      success: true,
      conversionId: conversionId,
      status: 'completed',
      message: 'Conversion completed successfully',
      inputFormat: inputExtension,
      outputFormat: outputFormat,
      downloadUrl: `/api/download/${conversionId}`,
      fileName: convertedFileName,
      fileSize: convertedContent.length,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
    });

  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ 
      error: 'Conversion failed', 
      details: error.message 
    });
  }
};