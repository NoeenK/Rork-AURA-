# Deploy to Fly.io - Quick Guide

Fly.io is super fast! ⚡

## Step 1: Install Fly CLI

**Windows (PowerShell):**
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

**Or download from:** https://fly.io/docs/getting-started/installing-flyctl/

## Step 2: Sign Up & Login

```bash
fly auth signup
# Or if you have an account:
fly auth login
```

## Step 3: Deploy

```bash
# Initialize (only first time)
fly launch --no-deploy

# Deploy!
fly deploy
```

That's it! You'll get a URL like:
- `https://target-finder-game.fly.dev`

## Why Fly.io?

✅ **Blazing fast** - Deploys in seconds  
✅ **Global edge network** - Fast worldwide  
✅ **Free tier** - 3 shared VMs free  
✅ **No sleep** - Always running  

## Updating

```bash
fly deploy
```

---

**Or use Railway for even simpler deployment (see DEPLOY_RAILWAY.md)**

