# Supabase Authentication Troubleshooting Guide

## Common Issues and Solutions

### 1. "Provider not enabled" Error

**Symptoms:**
- Authentication modal shows but login fails
- Console errors about disabled providers
- Users cannot sign in/up

**Solution:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Ensure Email provider toggle is ON
3. Ensure Google provider toggle is ON (if using)
4. Click "Save" after any changes
5. Wait 1-2 minutes for propagation
6. Test authentication

### 2. Google Authentication Not Working

**Symptoms:**
- Google sign-in button doesn't work
- Redirect errors
- "OAuth error" messages

**Solution:**
1. Verify Google Cloud Console setup:
   - OAuth 2.0 Client ID exists
   - Authorized redirect URIs include: https://[PROJECT_REF].supabase.co/auth/v1/callback
   - Client ID and Secret are correct
2. In Supabase Dashboard:
   - Google provider is enabled
   - Client ID and Secret are entered correctly
   - Configuration is saved

### 3. Environment Variable Issues

**Symptoms:**
- "Configuration failed to load" errors
- API connection failures
- Missing credentials warnings

**Solution:**
1. Check .env file exists and has correct values
2. Verify SUPABASE_URL matches your project URL exactly
3. Ensure SUPABASE_ANON_KEY is the correct anon/public key
4. Verify SUPABASE_SERVICE_KEY is the service role key
5. Restart your application after .env changes

### 4. CORS Errors

**Symptoms:**
- "CORS policy" errors in browser console
- Authentication requests blocked

**Solution:**
1. Go to Supabase Dashboard → Project Settings → API
2. Add your domain to CORS allowed origins
3. For development, add: http://localhost:5002
4. Save settings and wait for propagation

### 5. JWT Verification Failures

**Symptoms:**
- "Invalid JWT" errors
- Backend authentication failures
- Token verification errors

**Solution:**
1. Verify SUPABASE_JWT_SECRET matches Project Settings → API → JWT Settings
2. Ensure service role key is correct
3. Check token is being passed correctly in requests
4. Verify token hasn't expired

## Prevention Checklist

- [ ] Run monitor_supabase_providers.py daily
- [ ] Set up automated monitoring with cron
- [ ] Keep backup of configuration settings
- [ ] Test authentication after any Supabase changes
- [ ] Monitor Supabase status page for service issues
- [ ] Review authentication logs regularly

## Emergency Recovery Steps

1. **Check Supabase Status**: https://status.supabase.com/
2. **Verify Provider Settings**: Dashboard → Authentication → Providers
3. **Test API Connectivity**: Run verify_supabase_config.py
4. **Check Environment Variables**: Ensure all values are correct
5. **Review Recent Changes**: Check deployment logs
6. **Contact Support**: If all else fails, contact Supabase support

## Useful Commands

```bash
# Check configuration
python3 verify_supabase_config.py

# Monitor providers
python3 monitor_supabase_providers.py

# Test API endpoint
curl -X GET "http://localhost:5002/api/config" | jq

# Check environment variables
env | grep SUPABASE
```

## Contact Information

- Supabase Documentation: https://supabase.com/docs
- Supabase Support: https://supabase.com/support
- Community Discord: https://discord.supabase.com/
