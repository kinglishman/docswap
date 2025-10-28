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

// Find conversion file by ID
function findConversionFile(conversionId) {
  const sessionsDir = os.tmpdir();
  
  try {
    const sessionFiles = fs.readdirSync(sessionsDir).filter(f => f.startsWith('session_') && f.endsWith('.json'));
    
    for (const sessionFile of sessionFiles) {
      try {
        const sessionPath = path.join(sessionsDir, sessionFile);
        const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
        
        for (const fileId in sessionData) {
          const fileData = sessionData[fileId];
          if (fileData.conversions) {
            for (const convId in fileData.conversions) {
              if (convId === conversionId) {
                return fileData.conversions[convId];
              }
            }
          }
        }
      } catch (e) {
        continue;
      }
    }
  } catch (e) {
    console.error('Error reading sessions directory:', e);
  }
  
  return null;
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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Missing conversion ID' });
    }

    // Find the conversion file
    const conversionData = findConversionFile(id);
    if (!conversionData) {
      return res.status(404).json({ error: 'File not found or expired' });
    }

    // Check if file exists
    if (!fs.existsSync(conversionData.convertedFilePath)) {
      return res.status(404).json({ error: 'Converted file not found' });
    }

    // Read the file
    const fileContent = fs.readFileSync(conversionData.convertedFilePath);
    
    // Set appropriate headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${conversionData.convertedFileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', fileContent.length);

    // Send the file
    res.status(200).send(fileContent);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      error: 'Download failed', 
      details: error.message 
    });
  }
};