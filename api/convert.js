const fs = require('fs');
const path = require('path');
const os = require('os');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Supported conversions (simplified for initial deployment)
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
    const { file_id, output_format, session_id } = req.body;

    if (!file_id || !output_format) {
      return res.status(400).json({ 
        error: 'Missing required parameters: file_id, output_format' 
      });
    }

    // For demo purposes, assume the file exists and determine format from file_id pattern
    // In a real implementation, this would use a database or cloud storage to track files
    
    // Extract format from session data or use default
    // For now, we'll assume txt format as default and support common conversions
    const inputExtension = 'txt'; // Default assumption for demo
    
    // Check if conversion is supported
    if (!SUPPORTED_CONVERSIONS[inputExtension] || 
        !SUPPORTED_CONVERSIONS[inputExtension].includes(output_format)) {
      return res.status(400).json({ 
        error: `Conversion from ${inputExtension} to ${output_format} is not supported` 
      });
    }

    // For demo purposes, simulate successful conversion and return download URL
    // In a full implementation, this would trigger actual conversion logic
    const conversionId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    res.status(200).json({
      success: true,
      conversion_id: conversionId,
      status: 'completed',
      message: 'Conversion completed successfully',
      input_format: inputExtension,
      output_format: output_format,
      download_url: `/api/download/${file_id}`,
      file_size: 1024, // Demo file size
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
    });

  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ 
      error: 'Conversion failed', 
      details: error.message 
    });
  }
};