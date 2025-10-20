const { IncomingForm } = require('formidable');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// File size limit (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file extensions
const ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt',
  '.xls', '.xlsx', '.csv', '.ods',
  '.ppt', '.pptx', '.odp',
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.svg'
];

function isAllowedFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = new IncomingForm({
      maxFileSize: MAX_FILE_SIZE,
      uploadDir: os.tmpdir(),
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    
    if (!files.file || !files.file[0]) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const file = files.file[0];
    const originalFilename = file.originalFilename || 'unknown';

    if (!isAllowedFile(originalFilename)) {
      // Clean up uploaded file
      fs.unlinkSync(file.filepath);
      return res.status(400).json({ error: 'File type not supported' });
    }

    // Generate unique file ID
    const fileId = uuidv4();
    const sanitizedName = sanitizeFilename(originalFilename);
    const fileExtension = path.extname(sanitizedName);
    const baseName = path.basename(sanitizedName, fileExtension);
    
    // Create metadata
    const metadata = {
      file_id: fileId,
      original_filename: originalFilename,
      sanitized_filename: sanitizedName,
      file_size: file.size,
      file_extension: fileExtension,
      base_name: baseName,
      upload_time: new Date().toISOString(),
      temp_path: file.filepath
    };

    // Save metadata
    const metadataPath = path.join(os.tmpdir(), `${fileId}_metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    res.status(200).json({
      success: true,
      file_id: fileId,
      filename: originalFilename,
      size: file.size,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message 
    });
  }
};