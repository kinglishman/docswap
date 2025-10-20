# DocSwap Supabase Setup Guide

This guide walks you through setting up Supabase as the backend for DocSwap, replacing the current SQLite database and file-based session storage.

## Prerequisites

- Supabase account (free tier available)
- Access to Supabase dashboard
- Basic understanding of SQL and database concepts

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Name**: `docswap-production` (or your preferred name)
   - **Database Password**: Generate a strong password and save it securely
   - **Region**: Choose the region closest to your users
5. Click "Create new project"
6. Wait for the project to be created (usually 1-2 minutes)

## Step 2: Configure Database Schema

1. In your Supabase dashboard, go to the **SQL Editor**
2. Copy the contents of `supabase_schema.sql` from this repository
3. Paste it into the SQL Editor
4. Click **Run** to execute the schema
5. Verify that all tables were created successfully in the **Table Editor**

### Expected Tables:
- `profiles` - User profile information
- `files` - File upload and conversion tracking
- `sessions` - Session management
- `app_metrics` - Application metrics
- `user_activity` - User activity logging
- `system_health` - System health monitoring
- `contact_submissions` - Contact form submissions

## Step 3: Configure Authentication

1. Go to **Authentication** > **Settings**
2. Configure the following settings:

### Site URL
```
https://your-domain.com
```

### Redirect URLs (add all of these)
```
https://your-domain.com
https://your-domain.com/auth/callback
https://your-vercel-domain.vercel.app
https://your-vercel-domain.vercel.app/auth/callback
http://localhost:3000 (for development)
```

### Email Templates
Customize the email templates for:
- Confirm signup
- Magic link
- Change email address
- Reset password

### Providers
Enable the authentication providers you want to use:
- Email (enabled by default)
- Google (optional)
- GitHub (optional)
- Other providers as needed

## Step 4: Configure Storage (Optional)

If you want to store files in Supabase Storage instead of Vercel's file system:

1. Go to **Storage**
2. Create a new bucket called `docswap-files`
3. Configure bucket policies:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files" ON storage.objects
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to view their own files
CREATE POLICY "Users can view own files" ON storage.objects
FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public access to public files
CREATE POLICY "Public files are viewable" ON storage.objects
FOR SELECT USING (bucket_id = 'docswap-files' AND (storage.foldername(name))[1] = 'public');
```

## Step 5: Get API Keys

1. Go to **Settings** > **API**
2. Copy the following values (you'll need these for environment variables):
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **Project API Key (anon key)**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Project API Key (service_role key)**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **JWT Secret**: Found in the JWT Settings section

⚠️ **Important**: Keep the `service_role` key secure and never expose it in client-side code!

## Step 6: Environment Variables

Create or update your `.env` file with the Supabase configuration:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-jwt-secret

# For Vercel deployment, add these to your Vercel project settings
```

## Step 7: Configure Row Level Security (RLS)

The schema automatically enables RLS, but verify the policies:

1. Go to **Authentication** > **Policies**
2. Verify that policies exist for all tables
3. Test the policies by creating a test user and ensuring they can only access their own data

## Step 8: Set Up Database Functions

The schema includes several utility functions:

### Cleanup Functions
- `cleanup_expired_files()` - Removes expired files
- `cleanup_expired_sessions()` - Removes expired sessions

### Triggers
- Auto-update `updated_at` timestamps
- Auto-create user profiles when users sign up

## Step 9: Configure Webhooks (Optional)

For real-time updates and notifications:

1. Go to **Database** > **Webhooks**
2. Create webhooks for important events:
   - New user registration
   - File uploads
   - Contact form submissions

## Step 10: Testing

Test your Supabase setup:

1. Create a test user account
2. Verify the user profile is created automatically
3. Test file upload and session management
4. Check that RLS policies work correctly
5. Verify admin access to metrics tables

## Step 11: Monitoring and Maintenance

### Database Monitoring
- Monitor query performance in the **SQL Editor**
- Check storage usage in **Settings** > **Usage**
- Set up alerts for high usage

### Automated Cleanup
Consider setting up a cron job or Vercel cron to run cleanup functions:

```sql
-- Run daily cleanup
SELECT cleanup_expired_files();
SELECT cleanup_expired_sessions();
```

### Backup Strategy
- Supabase automatically backs up your database
- For additional security, consider setting up manual backups
- Export important data regularly

## Migration from SQLite

If you're migrating from an existing SQLite database:

1. Export data from SQLite using the provided migration script
2. Import the data into Supabase using the SQL Editor
3. Verify data integrity
4. Update application configuration to use Supabase
5. Test thoroughly before switching production traffic

## Troubleshooting

### Common Issues

1. **RLS Policies Too Restrictive**
   - Check that policies allow the necessary operations
   - Use the SQL Editor to test queries as different users

2. **Authentication Issues**
   - Verify redirect URLs are correctly configured
   - Check that JWT secret matches between Supabase and your app

3. **Performance Issues**
   - Add indexes for frequently queried columns
   - Use the Query Performance tab to identify slow queries

4. **Storage Issues**
   - Check bucket policies if using Supabase Storage
   - Verify file upload limits and formats

### Getting Help

- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- GitHub Issues: https://github.com/supabase/supabase/issues

## Security Best Practices

1. **Never expose service_role key** in client-side code
2. **Use RLS policies** to protect sensitive data
3. **Regularly rotate API keys** in production
4. **Monitor access logs** for suspicious activity
5. **Keep dependencies updated** for security patches
6. **Use HTTPS only** for all API calls
7. **Validate all inputs** before database operations

## Cost Optimization

### Free Tier Limits
- 500MB database storage
- 1GB file storage
- 2GB bandwidth per month
- 50MB file upload limit

### Optimization Tips
- Clean up expired files regularly
- Use appropriate data types to minimize storage
- Index frequently queried columns
- Monitor usage in the Supabase dashboard

## Next Steps

After completing the Supabase setup:

1. Update your application code to use Supabase APIs
2. Test all functionality thoroughly
3. Deploy to Vercel with the new environment variables
4. Monitor performance and usage
5. Set up automated backups and monitoring

Your DocSwap application is now ready to use Supabase as its backend database!