# Deploy to Railway - Quick Guide

Railway is faster and easier than Render! 🚀

## Step 1: Sign Up

1. Go to [https://railway.app](https://railway.app)
2. Sign up with GitHub (it's instant)

## Step 2: Deploy

### Option A: One-Click Deploy (Easiest)

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository: `Rork-AURA-`
4. Railway auto-detects Python and deploys automatically!
5. Done! You'll get a URL immediately.

### Option B: Manual Setup

1. Click **"New Project"** → **"Empty Project"**
2. Click **"Add Service"** → **"GitHub Repo"**
3. Select your repository
4. Railway detects `railway.json` and auto-configures everything
5. Wait ~1 minute for deployment

## Step 3: Get Your URL

Railway automatically provides a URL like:
- `https://target-finder-game-production.up.railway.app`

Or you can add a custom domain in settings!

## Why Railway?

✅ **Faster deployments** - Usually 1-2 minutes  
✅ **No sleep on free tier** - Always running  
✅ **Free $5 credit monthly** - More than enough  
✅ **Auto-detects config** - Just works  

## Updating

Just push to GitHub - Railway auto-deploys!

```bash
git push
```

---

**Alternative: Fly.io** (Also fast, see DEPLOY_FLY.md)

