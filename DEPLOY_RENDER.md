# Deploy to Render - Quick Guide

## Step 1: Prepare Your Repository

Make sure all game files are committed to Git:
- `app.py`
- `templates/index.html`
- `requirements.txt`
- `Procfile`
- `render.yaml`

## Step 2: Create Render Account

1. Go to [https://render.com](https://render.com)
2. Sign up for a free account (GitHub/Google sign-in works)

## Step 3: Deploy via Render Dashboard

### Option A: Using render.yaml (Recommended)

1. In Render dashboard, click **"New +"** → **"Blueprint"**
2. Connect your GitHub/GitLab/Bitbucket repository
3. Select the repository containing your game
4. Render will auto-detect `render.yaml` and deploy automatically
5. Click **"Apply"** and wait for deployment (~2-3 minutes)

### Option B: Manual Web Service

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Connect your repository
3. Configure:
   - **Name**: `target-finder-game` (or any name you like)
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`
   - **Plan**: Free (or choose paid for more resources)
4. Click **"Create Web Service"**

## Step 4: Get Your Public URL

Once deployed, Render will provide a public URL like:
- `https://target-finder-game.onrender.com`

Your game is now live! 🎉

## Troubleshooting

### Build Fails?
- Check that all files are committed to Git
- Verify `requirements.txt` is correct
- Check Render logs for specific errors

### App Not Starting?
- Verify the start command: `gunicorn app:app --bind 0.0.0.0:$PORT`
- Check that `gunicorn` is in `requirements.txt`
- Review application logs in Render dashboard

### Need Environment Variables?
- Go to your service → **Environment**
- Add any required variables
- Redeploy if needed

## Free Tier Limitations

- Service sleeps after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- 750 hours/month free

## Updating Your App

Just push changes to your Git repository - Render will auto-deploy!

```bash
git add .
git commit -m "Update game"
git push
```

Render will automatically rebuild and deploy your changes.

