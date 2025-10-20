// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Supported file formats and conversions
const CAPABILITIES = {
  supported_input_formats: [
    'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt',
    'xls', 'xlsx', 'csv', 'ods',
    'ppt', 'pptx', 'odp',
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp', 'svg'
  ],
  supported_output_formats: [
    'pdf', 'doc', 'docx', 'txt', 'rtf',
    'xls', 'xlsx', 'csv',
    'ppt', 'pptx',
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'
  ],
  conversion_matrix: {
    'pdf': ['txt', 'docx', 'jpg', 'png'],
    'doc': ['pdf', 'docx', 'txt', 'rtf'],
    'docx': ['pdf', 'doc', 'txt', 'rtf'],
    'txt': ['pdf', 'doc', 'docx', 'rtf'],
    'rtf': ['pdf', 'doc', 'docx', 'txt'],
    'odt': ['pdf', 'doc', 'docx', 'txt'],
    'xls': ['xlsx', 'csv', 'pdf'],
    'xlsx': ['xls', 'csv', 'pdf'],
    'csv': ['xls', 'xlsx', 'pdf'],
    'ods': ['xls', 'xlsx', 'csv', 'pdf'],
    'ppt': ['pptx', 'pdf'],
    'pptx': ['ppt', 'pdf'],
    'odp': ['ppt', 'pptx', 'pdf'],
    'jpg': ['pdf', 'png', 'gif', 'bmp', 'tiff', 'webp'],
    'jpeg': ['pdf', 'png', 'gif', 'bmp', 'tiff', 'webp'],
    'png': ['pdf', 'jpg', 'gif', 'bmp', 'tiff', 'webp'],
    'gif': ['pdf', 'jpg', 'png', 'bmp', 'tiff', 'webp'],
    'bmp': ['pdf', 'jpg', 'png', 'gif', 'tiff', 'webp'],
    'tiff': ['pdf', 'jpg', 'png', 'gif', 'bmp', 'webp'],
    'webp': ['pdf', 'jpg', 'png', 'gif', 'bmp', 'tiff'],
    'svg': ['pdf', 'jpg', 'png']
  },
  max_file_size: 10485760, // 10MB in bytes
  max_files_per_session: 5,
  session_timeout: 3600, // 1 hour in seconds
  features: {
    batch_conversion: true,
    password_protection: false,
    compression_options: true,
    quality_settings: true,
    custom_page_sizes: true,
    watermarks: false
  }
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
    res.status(200).json({
      success: true,
      service: 'DocSwap API',
      version: '1.0.0',
      capabilities: CAPABILITIES,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Capabilities error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve capabilities', 
      details: error.message 
    });
  }
};