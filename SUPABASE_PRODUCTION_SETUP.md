# Supabase Production Setup for Vercel

## Step 1: Create Cloud Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub
4. Click "New Project"
5. Fill in:
   - **Name:** `lenilani-chatbot-production`
   - **Database Password:** (generate a strong password - save this!)
   - **Region:** Choose closest to your users
6. Click "Create new project" (takes ~2 minutes to provision)

## Step 2: Run Database Migration

Once your project is ready:

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the contents of `supabase/migrations/20251024075809_create_analytics_table.sql`
4. Click "Run" to create the analytics table

## Step 3: Get API Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")

## Step 4: Add Environment Variables to Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these two variables:

   ```
   Name: SUPABASE_URL
   Value: [paste your Project URL]
   Environments: Production, Preview, Development
   ```

   ```
   Name: SUPABASE_ANON_KEY
   Value: [paste your anon public key]
   Environments: Production, Preview, Development
   ```

4. Click "Save"

## Step 5: Deploy to Vercel

You have two options:

### Option A: Git Push (Recommended)
```bash
git add -A
git commit -m "Add Supabase production database"
git push origin main
```

Vercel will auto-deploy with the new environment variables.

### Option B: Manual Deploy
```bash
vercel --prod
```

## Verify It Works

1. Once deployed, visit your production site
2. Have a test conversation with the chatbot
3. Check your Supabase dashboard:
   - Go to **Table Editor** → **analytics**
   - You should see the conversation count increment

## Local vs Production

Your code automatically detects the environment:

- **Local development:** Uses `http://127.0.0.1:54321` (Docker Supabase)
- **Production:** Uses your cloud Supabase project (via env variables)

No code changes needed!

## Troubleshooting

**Analytics not updating?**
- Check Vercel logs for Supabase errors
- Verify environment variables are set correctly
- Check Supabase dashboard → **Logs** for database errors

**Migration didn't work?**
- Make sure you're in the correct project
- Check for SQL errors in the Supabase SQL Editor
- The table should appear in **Table Editor** → **analytics**
