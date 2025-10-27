# DocSwap Vercel Deployment Guide

## Overview
This guide covers deploying DocSwap to Vercel with Supabase backend integration.

## Prerequisites
1. Vercel account (free tier available)
2. Supabase project (free tier available)
3. GitHub repository for the project

## Deployment Steps

### 1. Prepare Supabase
1. Create/restore your Supabase project
2. Note down:
   - Project URL (SUPABASE_URL)
   - Anon/Public Key (SUPABASE_ANON_KEY)
   - Service Role Key (SUPABASE_SERVICE_ROLE_KEY)

### 2. Deploy to Vercel
1. Connect your GitHub repository to Vercel
2. Set the following environment variables in Vercel:
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

### 3. Configure Build Settings
Vercel will automatically detect the `vercel.json` configuration:
- Frontend: Static files served from root
- Backend: Python serverless functions in `/api` directory
- Build command: Not required (static files)
- Output directory: Not required (root)

### 4. Domain Configuration
- Vercel provides a free `.vercel.app` domain
- Configure custom domain if needed
- SSL is automatically provided

## File Structure
```
/
├── api/                    # Vercel serverless functions
│   ├── __init__.py
│   ├── _utils.py          # Shared utilities
│   ├── _conversion.py     # Conversion logic
│   ├── config.py          # /api/config
│   ├── upload.py          # /api/upload & /api/upload/public
│   ├── convert.py         # /api/convert & /api/convert/public
│   ├── download.py        # /api/download & /api/download/public
│   ├── capabilities.py    # /api/capabilities
│   ├── health.py          # /api/health
│   ├── contact.py         # /api/contact & /api/contact/public
│   ├── profile.py         # /api/profile
│   └── session.py         # /api/session
├── static/                # Frontend assets
├── js/                    # JavaScript files
├── css/                   # Stylesheets
├── index.html             # Main page
├── vercel.json            # Vercel configuration
└── requirements-vercel.txt # Python dependencies
```

## API Endpoints
All original endpoints are preserved:
- `/api/config` - Supabase configuration
- `/api/upload/public` & `/api/upload` - File upload
- `/api/convert/public` & `/api/convert` - File conversion
- `/api/download/public/{file_id}` & `/api/download/{file_id}` - File download
- `/api/capabilities` - Supported formats
- `/api/health` - System status
- `/api/contact/public` & `/api/contact` - Contact form
- `/api/profile` - User profile (authenticated)
- `/api/session/*` - Session management

## Features Supported
✅ All file conversion formats (15+ formats)
✅ Public and authenticated uploads/conversions
✅ User authentication via Supabase
✅ File management and history
✅ Contact forms
✅ Multi-language support
✅ Responsive design
✅ Font Awesome icons
✅ Rate limiting
✅ Security headers
✅ CORS support

## Cost Comparison
### Current VPS vs Vercel + Supabase
- **VPS**: $5-20/month + maintenance
- **Vercel + Supabase**: Free tier covers most usage
  - Vercel: 100GB bandwidth, 100 serverless function invocations/day
  - Supabase: 500MB database, 1GB file storage, 50MB file uploads

## Benefits
- ✅ Zero server maintenance
- ✅ Automatic scaling
- ✅ Global CDN
- ✅ Automatic SSL
- ✅ Git-based deployments
- ✅ Built-in monitoring
- ✅ 99.99% uptime SLA

## Testing
After deployment, test all functionality:
1. File upload and conversion
2. User authentication
3. File download
4. Contact form
5. Multi-language switching
6. Mobile responsiveness

## Monitoring
- Vercel Analytics: Built-in performance monitoring
- Supabase Dashboard: Database and API monitoring
- Error tracking via Vercel Functions logs

## Support
- Vercel: Excellent documentation and community
- Supabase: Active Discord community and docs
- Both platforms offer free tiers suitable for most use cases