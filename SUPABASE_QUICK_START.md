# DocSwap Supabase Authentication - Quick Start Guide

This guide provides quick steps to get started with Supabase authentication in your DocSwap application.

## What's Been Implemented

- Email/password authentication
- Google OAuth sign-in
- User profile display in the navigation bar
- Backend token verification for protected API routes

## Setup Steps

### 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign up or log in
2. Click "New Project" and follow the setup wizard
3. Note your project URL and anon key (found in Project Settings → API)

### 2. Update Configuration

Open `/js/supabase-config.js` and replace the placeholder values with your actual Supabase credentials:

```javascript
const SUPABASE_CONFIG = {
    SUPABASE_URL: 'https://your-project-id.supabase.co',
    SUPABASE_ANON_KEY: 'your-anon-key'
};
```

### 3. Enable Authentication Providers

#### Email/Password:
1. In Supabase dashboard, go to Authentication → Providers
2. Ensure Email provider is enabled
3. Configure email settings as needed

#### Google Sign-In:
1. In Supabase dashboard, go to Authentication → Providers → Google
2. Enable Google provider
3. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/)
4. Add your Supabase redirect URL as an authorized redirect URI:
   - Format: `https://[YOUR_PROJECT_REF].supabase.co/auth/v1/callback`
5. Enter the Google Client ID and Client Secret in Supabase

### 4. Configure Backend (Optional)

If you want to use the backend API with Supabase authentication:

1. Set environment variables for your Flask application:
   ```bash
   export SUPABASE_URL=https://your-project-id.supabase.co
   export SUPABASE_SERVICE_KEY=your-service-role-key
   ```

2. Restart your Flask server

## Testing Authentication

1. Start your DocSwap application
2. Click the "Sign In" button in the navigation bar
3. Test both email/password registration and Google sign-in
4. After signing in, your email should appear in the navigation bar

## Troubleshooting

- If Google sign-in doesn't work, verify your Google OAuth configuration
- For CORS issues, add your site URL to allowed URLs in Supabase (Project Settings → API → CORS)
- Check browser console for any JavaScript errors

## Next Steps

- Implement user-specific file storage
- Add user profile management
- Set up role-based access control

## Additional Resources

For more detailed setup instructions, see the [SUPABASE_AUTH_SETUP.md](SUPABASE_AUTH_SETUP.md) file.