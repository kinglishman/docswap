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

function isAllowedFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
}

// Main Vercel serverless function
module.exports = async (req, res) => {
  // Set CORS headers
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key]);
  });
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  const { url } = req;
  
  try {
    // Handle config endpoint
    if (url === '/api/config') {
      const config = {
        supabaseUrl: process.env.SUPABASE_URL || '',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
        status: 'success'
      };
      
      res.status(200).json(config);
      return;
    }
    
    // Handle health endpoint
    if (url === '/api/health') {
      const health = {
        status: 'healthy',
        service: 'DocSwap API',
        timestamp: Date.now(),
        version: '2.0.0'
      };
      
      res.status(200).json(health);
      return;
    }
    
    // Handle capabilities endpoint
    if (url === '/api/capabilities') {
      res.status(200).json({
        success: true,
        supported_conversions: SUPPORTED_CONVERSIONS,
        max_file_size: MAX_FILE_SIZE,
        allowed_extensions: ALLOWED_EXTENSIONS
      });
      return;
    }
    
    // Handle upload endpoint
    if (url === '/api/upload') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      
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
        fs.unlinkSync(file.filepath);
        return res.status(400).json({ error: 'File type not supported' });
      }

      const fileId = uuidv4();
      const sanitizedName = sanitizeFilename(originalFilename);
      const fileExtension = path.extname(sanitizedName);
      const baseName = path.basename(sanitizedName, fileExtension);
      
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

      const metadataPath = path.join(os.tmpdir(), `${fileId}_metadata.json`);
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      res.status(200).json({
        success: true,
        file_id: fileId,
        filename: originalFilename,
        size: file.size,
        message: 'File uploaded successfully'
      });
      return;
    }
    
    // Handle convert endpoint
    if (url === '/api/convert') {
      if (req.method === 'GET') {
        return res.status(200).json({
          success: true,
          supported_conversions: SUPPORTED_CONVERSIONS
        });
      }
      
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const { file_id, output_format, session_id } = req.body;

      if (!file_id || !output_format) {
        return res.status(400).json({ 
          error: 'Missing required parameters: file_id, output_format' 
        });
      }

      const metadataPath = path.join(os.tmpdir(), `${file_id}_metadata.json`);
      
      if (!fs.existsSync(metadataPath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      const inputExtension = metadata.file_extension.substring(1);
      
      if (!SUPPORTED_CONVERSIONS[inputExtension] || 
          !SUPPORTED_CONVERSIONS[inputExtension].includes(output_format)) {
        return res.status(400).json({ 
          error: `Conversion from ${inputExtension} to ${output_format} is not supported` 
        });
      }

      const conversionId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      res.status(200).json({
        success: true,
        conversion_id: conversionId,
        status: 'completed',
        message: 'File converted successfully',
        input_format: inputExtension,
        output_format: output_format,
        download_url: `/api/download/${conversionId}`,
        file_size: metadata.file_size
      });
      return;
    }
    
    // Handle download endpoint
    if (url.startsWith('/api/download/')) {
      const conversionId = url.split('/api/download/')[1];
      
      // For demo purposes, return a simple text file
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename="converted_file.txt"');
      res.status(200).send('This is a demo converted file. Full conversion logic will be implemented.');
      return;
    }
    
    // Default response for unknown endpoints
    res.status(404).json({
      error: 'Endpoint not found',
      path: url,
      available_endpoints: ['/api/health', '/api/config', '/api/capabilities', '/api/upload', '/api/convert']
    });
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};