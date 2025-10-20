# Git Integration with Vercel - Setup Guide

## Overview
This guide will help you connect your DocSwap project to a Git repository for automatic deployments.

## Benefits of Git Integration
- ✅ Automatic deployments on every push
- ✅ Branch previews for testing
- ✅ Better version control and rollback
- ✅ Collaborative development
- ✅ Environment variables managed through Vercel dashboard

## Step-by-Step Setup

### 1. Create a Git Repository

#### Option A: GitHub (Recommended)
1. Go to [GitHub](https://github.com)
2. Click "New repository"
3. Name it `docswap` or `docswap-app`
4. Make it **Private** (recommended for production apps)
5. Don't initialize with README (we have files already)

#### Option B: GitLab or Bitbucket
Similar process - create a new repository

### 2. Initialize Local Git Repository

```bash
# Initialize git in your project
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial DocSwap deployment"

# Add remote repository (replace with your repo URL)
git remote add origin https://github.com/yourusername/docswap.git

# Push to repository
git push -u origin main
```

### 3. Connect Vercel to Git Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your Git repository
4. Configure build settings:
   - **Framework Preset**: Other
   - **Root Directory**: ./
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
   - **Install Command**: pip install -r requirements-vercel.txt

### 4. Environment Variables
Your environment variables are already configured, so they'll work automatically!

### 5. Custom Domain (Optional)
- Add your custom domain in Vercel project settings
- Update DNS records as instructed by Vercel

## Workflow After Git Integration

1. **Make changes** to your code locally
2. **Commit changes**: `git add . && git commit -m "Description of changes"`
3. **Push to repository**: `git push`
4. **Automatic deployment** happens on Vercel
5. **Preview URL** generated for testing

## Branch Strategy

- **main/master**: Production deployments
- **develop**: Staging/preview deployments
- **feature branches**: Individual feature previews

## Important Files for Git

Make sure these files are properly configured:

- ✅ `.gitignore` - Already configured
- ✅ `requirements-vercel.txt` - Already exists
- ✅ `vercel.json` - Already configured
- ✅ Environment variables - Already set in Vercel

## Security Notes

- ✅ Never commit `.env` files (already in .gitignore)
- ✅ Use Vercel environment variables for secrets
- ✅ Keep repository private for production apps
- ✅ Review commits before pushing

## Next Steps After Git Integration

1. Set up branch protection rules
2. Configure automatic testing (GitHub Actions)
3. Set up monitoring and alerts
4. Document deployment process for team

---

**Note**: This setup is optional but recommended for long-term maintenance and collaboration.