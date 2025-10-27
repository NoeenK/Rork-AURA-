# Supabase Setup Instructions

## Network Request Failed Error - Fix

The "Network request failed" errors you're seeing are because the Supabase environment variables are not properly configured. Follow these steps to fix it:

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new account or sign in
3. Click "New Project"
4. Fill in:
   - Project Name: `aura-memory`
   - Database Password: (create a strong password)
   - Region: Choose closest to your users
5. Wait for project to be created (~2 minutes)

### 2. Get Your API Keys

1. In your Supabase dashboard, click on your project
2. Go to **Settings** → **API**
3. Copy these values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (the long key under "Project API keys")

### 3. Update Environment Variables

Create a `.env` file in your project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_OPENAI_API_KEY=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
```

**Important:** Replace `your-project-id` and `your-anon-key-here` with your actual values from step 2!

### 4. Set Up Database Tables

In your Supabase dashboard:

1. Go to **SQL Editor**
2. Click **New Query**
3. Paste this SQL:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  google_id TEXT,
  apple_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create recordings table
CREATE TABLE IF NOT EXISTS recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  audio_url TEXT,
  transcript TEXT,
  summary TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  date TIMESTAMP,
  calendar_id TEXT,
  source TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own recordings" ON recordings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recordings" ON recordings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recordings" ON recordings
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own events" ON events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" ON events
  FOR DELETE USING (auth.uid() = user_id);
```

4. Click **Run** to execute the SQL

### 5. Configure Authentication Providers

#### For Email/Password (Already Working)
Email auth is enabled by default, so this will work immediately once you have the environment variables set!

#### For Google OAuth (Optional)
1. Go to **Authentication** → **Providers**
2. Click **Google**
3. Enable Google provider
4. Follow the instructions to set up Google OAuth credentials
5. Add your redirect URL: `rork-app://auth/callback`

#### For Apple Sign In (Optional - iOS only)
1. Go to **Authentication** → **Providers**
2. Click **Apple**
3. Enable Apple provider
4. Follow Apple's setup instructions for Sign in with Apple

### 6. Restart Your Development Server

After setting up the `.env` file:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
bun start --clear
```

### 7. Test the Authentication

1. Click "Create account" button
2. Enter an email and password
3. Click "Sign Up"
4. Check your email for verification (if email confirmation is enabled in Supabase)
5. You should now be signed in!

## Troubleshooting

### Still Getting Network Errors?

1. **Check your .env file**: Make sure it's in the project root (same folder as app.json)
2. **Verify the values**: Copy-paste your Supabase URL and key again to ensure no typos
3. **Restart the server**: Always restart after changing .env files
4. **Check Supabase dashboard**: Make sure your project is active and not paused

### Email not sending?

1. Go to Supabase **Authentication** → **Email Templates**
2. You can disable email confirmation for testing:
   - Go to **Authentication** → **Providers** → **Email**
   - Uncheck "Confirm email"

### Want to test without setting up Supabase?

For quick testing, you can temporarily skip OAuth providers:
- Use only the email/password authentication
- The email auth will work once Supabase is properly configured

## Next Steps

Once authentication is working:
- Test the recording feature
- Add user profile data to the database
- Set up storage buckets for audio files
- Configure push notifications

---

**Need Help?** Check the [Supabase Documentation](https://supabase.com/docs) or ask for assistance!
