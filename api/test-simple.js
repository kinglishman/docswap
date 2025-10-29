module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    // Get the path from the URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    if (path.includes('/test')) {
      res.status(200).json({
        status: 'success',
        message: 'JavaScript API is working!',
        timestamp: new Date().toISOString(),
        environment: {
          supabaseUrl: process.env.SUPABASE_URL || 'not_set',
          hasAnonKey: !!process.env.SUPABASE_ANON_KEY
        }
      });
    } else if (path.includes('/config')) {
      res.status(200).json({
        supabaseUrl: process.env.SUPABASE_URL || 'https://qzuwonueyvouvrhiwcob.supabase.co',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6dXdvbnVleXZvdXZyaGl3Y29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzM2ODgsImV4cCI6MjA2MjY0OTY4OH0.hRGTJ4oPFs6lJ4O17oeRbFOMYAgMxyMM2DSjSd5_W00',
        maxFileSize: 100 * 1024 * 1024, // 100MB
        allowedExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png']
      });
    } else {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};