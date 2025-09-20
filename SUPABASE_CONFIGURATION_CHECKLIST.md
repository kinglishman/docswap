# Supabase Configuration Checklist

This checklist ensures your Supabase project is properly configured and prevents common issues like providers being disabled.

## ✅ Pre-Setup Checklist

### 1. Supabase Project Setup
- [ ] Supabase project created
- [ ] Project URL and keys obtained
- [ ] Database password set and saved securely

### 2. Authentication Providers Configuration

#### Email Provider
- [ ] **Authentication** → **Providers** → **Email** is **ENABLED**
- [ ] Email confirmation settings configured as needed
- [ ] Custom email templates set up (optional)

#### Google OAuth Provider
- [ ] **Authentication** → **Providers** → **Google** is **ENABLED**
- [ ] Google Cloud Console project created
- [ ] OAuth 2.0 Client ID created in Google Cloud Console
- [ ] Authorized redirect URIs added: `https://[YOUR_PROJECT_REF].supabase.co/auth/v1/callback`
- [ ] Google Client ID entered in Supabase
- [ ] Google Client Secret entered in Supabase
- [ ] Google provider configuration **SAVED**

### 3. Site URL Configuration
- [ ] **Authentication** → **URL Configuration** → **Site URL** set to your domain
- [ ] **Additional redirect URLs** added if needed
- [ ] For development: `http://localhost:5002` added to redirect URLs

### 4. CORS Configuration
- [ ] **Project Settings** → **API** → **CORS** configured
- [ ] Your domain added to allowed origins
- [ ] For development: `http://localhost:5002` added to allowed origins

### 5. Environment Variables
- [ ] `.env` file created with correct values
- [ ] `SUPABASE_URL` matches your project URL exactly
- [ ] `SUPABASE_ANON_KEY` is the correct anon/public key
- [ ] `SUPABASE_SERVICE_KEY` is the correct service role key
- [ ] `SUPABASE_JWT_SECRET` is set (found in Project Settings → API → JWT Settings)

## 🔧 Configuration Verification Script

Run this verification to ensure everything is set up correctly:

### Backend Verification
```bash
# Check environment variables
echo "SUPABASE_URL: $SUPABASE_URL"
echo "SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:0:20}..."
echo "SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY:0:20}..."

# Test API endpoint
curl -X GET "http://localhost:5002/api/config" | jq
```

### Frontend Verification
Open browser console and run:
```javascript
// Check if Supabase is loaded
console.log('Supabase loaded:', !!window.supabase);

// Check configuration
console.log('Config:', window.SUPABASE_CONFIG);

// Test connection
if (window.supabase && window.SUPABASE_CONFIG.SUPABASE_URL) {
    const client = window.supabase.createClient(
        window.SUPABASE_CONFIG.SUPABASE_URL,
        window.SUPABASE_CONFIG.SUPABASE_ANON_KEY
    );
    client.auth.getSession().then(console.log);
}
```

## 🚨 Common Issues & Solutions

### Issue: "Provider not enabled" Error
**Solution:**
1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Ensure the provider (Email/Google) toggle is **ON**
3. Click **Save** after making changes
4. Wait 1-2 minutes for changes to propagate

### Issue: Google Sign-in Not Working
**Solution:**
1. Verify Google Cloud Console OAuth setup
2. Check redirect URI exactly matches: `https://[PROJECT_REF].supabase.co/auth/v1/callback`
3. Ensure Google provider is enabled in Supabase
4. Verify Client ID and Secret are correctly entered

### Issue: CORS Errors
**Solution:**
1. Add your domain to **Project Settings** → **API** → **CORS**
2. For development, add `http://localhost:5002`
3. Save and wait for propagation

### Issue: JWT Verification Fails
**Solution:**
1. Verify `SUPABASE_JWT_SECRET` matches the one in Project Settings → API
2. Ensure service role key is correct
3. Check that tokens are being passed correctly

## 📋 Monthly Maintenance Checklist

- [ ] Verify all authentication providers are still enabled
- [ ] Check for any Supabase service updates or breaking changes
- [ ] Review authentication logs for any issues
- [ ] Test authentication flows (email, Google)
- [ ] Verify environment variables are still correct
- [ ] Check CORS settings are still appropriate

## 🔄 Backup Configuration

Document your current settings:

```
Project URL: ___________________________
Project Reference: _____________________
Google Client ID: ______________________
Site URL: ______________________________
Redirect URLs: _________________________
CORS Origins: __________________________
```

## 📞 Emergency Recovery

If authentication suddenly stops working:

1. **Check Supabase Status**: Visit [Supabase Status Page](https://status.supabase.com/)
2. **Verify Provider Settings**: Ensure all providers are still enabled
3. **Check Environment Variables**: Verify all keys are still valid
4. **Test API Endpoint**: Ensure `/api/config` returns correct values
5. **Review Recent Changes**: Check if any recent deployments caused issues

## 🎯 Best Practices

1. **Always test authentication after any Supabase configuration changes**
2. **Keep a backup of your configuration settings**
3. **Use environment variables for all sensitive data**
4. **Monitor authentication logs regularly**
5. **Set up alerts for authentication failures**
6. **Document any custom configurations**

---

**Last Updated:** $(date)
**Next Review:** $(date -d '+1 month')