# Supabase Authentication Setup for DocSwap

This guide will help you set up Supabase authentication for your DocSwap application, enabling users to sign in with email/password and Google authentication.

## 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign up or log in
2. Create a new project
3. Choose a name for your project and set a secure database password
4. Select a region closest to your users
5. Wait for your project to be created (this may take a few minutes)

## 2. Configure Authentication

### Email/Password Authentication

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Ensure **Email** provider is enabled
3. Configure email settings as needed:
   - You can enable/disable email confirmations
   - Customize the email template if desired

### Google Authentication

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Google** in the list and click on it
3. Toggle the switch to enable Google authentication
4. You'll need to set up OAuth credentials in the Google Cloud Console:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Navigate to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Set the application type to **Web application**
   - Add your Supabase redirect URL as an authorized redirect URI
     - Format: `https://[YOUR_PROJECT_REF].supabase.co/auth/v1/callback`
   - Copy the **Client ID** and **Client Secret**
5. Back in Supabase, enter the Google Client ID and Client Secret
6. Click **Save**

## 3. Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Project Settings** → **API**
2. You'll need two values:
   - **Project URL**: This is your Supabase project URL
   - **anon public** key: This is your public API key

## 4. Update DocSwap Configuration

1. Open the file `js/supabase-config.js` in your DocSwap project
2. Replace the placeholder values with your actual Supabase credentials:

```javascript
const SUPABASE_CONFIG = {
    SUPABASE_URL: 'https://your-project-id.supabase.co',
    SUPABASE_ANON_KEY: 'your-anon-key'
};
```

## 5. Configure Backend (Optional)

If you want to use the backend API with Supabase authentication:

1. Set the following environment variables for your Flask application:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_KEY`: Your Supabase service role key (found in Project Settings → API)

2. For local development, you can create a `.env` file in your project root:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

3. Install the required Python packages:

```bash
pip install -r requirements.txt
```

## 6. Testing Authentication

1. Start your DocSwap application
2. Click the "Sign In" button in the navigation bar
3. Test both email/password registration and Google sign-in
4. Verify that the user profile appears after successful authentication

## Troubleshooting

- **CORS Issues**: If you encounter CORS errors, make sure your site URL is added to the allowed URLs in Supabase (Project Settings → API → CORS)
- **Redirect Problems**: For Google authentication, ensure the redirect URL in Google Cloud Console exactly matches the one provided by Supabase
- **JWT Verification**: If the backend fails to verify tokens, check that you're using the correct Supabase URL and keys

## Security Considerations

- Never expose your service role key in client-side code
- Use environment variables for sensitive information in your backend
- Consider implementing additional security measures like rate limiting for authentication endpoints

## Additional Resources

- [Supabase Authentication Documentation](https://supabase.com/docs/guides/auth)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/auth-signin)
- [Google OAuth Setup Guide](https://developers.google.com/identity/protocols/oauth2)