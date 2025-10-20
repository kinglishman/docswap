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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract file ID from query parameters
    const { id: fileId } = req.query;

    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    // For demo purposes, return a simple converted file
    // In a real implementation, this would retrieve the actual converted file
    const demoContent = `This is a demo converted file for file ID: ${fileId}
    
Original file has been processed and converted.
Conversion completed at: ${new Date().toISOString()}

This is a placeholder response. In a full implementation, this would be the actual converted file content.`;

    // Set appropriate headers for file download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="converted_${fileId}.txt"`);
    res.status(200).send(demoContent);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};