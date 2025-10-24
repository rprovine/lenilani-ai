#!/bin/bash

# Setup Production Supabase with CLI
# Run this script to configure Supabase for production deployment

echo "🚀 Setting up Supabase for Production"
echo "======================================"
echo ""

# Step 1: Login to Supabase
echo "Step 1: Login to Supabase"
echo "This will open your browser to authenticate..."
echo ""
supabase login

if [ $? -ne 0 ]; then
  echo "❌ Login failed. Please try again."
  exit 1
fi

echo ""
echo "✅ Login successful!"
echo ""

# Step 2: Link to existing project or create new
echo "Step 2: Link to Cloud Project"
echo "Options:"
echo "  a) Link to existing project"
echo "  b) Create new project"
echo ""
read -p "Choose (a/b): " choice

if [ "$choice" = "b" ]; then
  echo ""
  echo "Creating new project..."
  echo "Note: This will create it in your Supabase organization"
  echo ""
  supabase projects create lenilani-chatbot-production --org-id $(supabase orgs list --format json | jq -r '.[0].id') --db-password $(openssl rand -base64 32) --region us-west-1

  if [ $? -ne 0 ]; then
    echo "❌ Failed to create project. You may need to create it manually at supabase.com"
    exit 1
  fi

  # Get the project ref
  PROJECT_REF=$(supabase projects list --format json | jq -r '.[] | select(.name == "lenilani-chatbot-production") | .id')
else
  echo ""
  echo "Available projects:"
  supabase projects list
  echo ""
  read -p "Enter project ID to link: " PROJECT_REF
fi

echo ""
echo "Linking to project: $PROJECT_REF"
supabase link --project-ref "$PROJECT_REF"

if [ $? -ne 0 ]; then
  echo "❌ Failed to link project"
  exit 1
fi

echo ""
echo "✅ Project linked!"
echo ""

# Step 3: Push migration
echo "Step 3: Pushing database migration..."
supabase db push

if [ $? -ne 0 ]; then
  echo "❌ Failed to push migration"
  exit 1
fi

echo ""
echo "✅ Migration pushed!"
echo ""

# Step 4: Get credentials
echo "Step 4: Getting API credentials for Vercel..."
echo ""

API_URL=$(supabase status | grep "API URL" | awk '{print $3}' | sed 's/http:\/\/127.0.0.1:54321/https:\/\/'"$PROJECT_REF"'.supabase.co/')
ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')

echo "================================================"
echo "✅ SETUP COMPLETE!"
echo "================================================"
echo ""
echo "Add these to Vercel environment variables:"
echo ""
echo "SUPABASE_URL=$API_URL"
echo ""
echo "SUPABASE_ANON_KEY=$ANON_KEY"
echo ""
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Go to Vercel dashboard → Settings → Environment Variables"
echo "2. Add the two variables above"
echo "3. Deploy: git push origin main"
echo ""
