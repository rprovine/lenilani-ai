# Deployment Guide for LeniLani AI

This guide covers deploying LeniLani AI to various platforms, with a focus on Vercel (recommended).

## Table of Contents
- [Prerequisites](#prerequisites)
- [Vercel Deployment (Recommended)](#vercel-deployment-recommended)
- [Custom Domain Setup](#custom-domain-setup)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Alternative Platforms](#alternative-platforms)

## Prerequisites

Before deployment, ensure you have:
1. A GitHub account with the repository
2. Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
3. (Optional) LangChain API key from [smith.langchain.com](https://smith.langchain.com)
4. Node.js 18+ installed locally for testing

## Vercel Deployment (Recommended)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Deploy to Vercel

From your project directory:

```bash
vercel
```

Follow the prompts:
- Set up and deploy: `Y`
- Which scope: Choose your account
- Link to existing project: `N` (for first deployment)
- Project name: `langchain-chatbot-lenilani`
- Directory: `.` (current directory)
- Override settings: `N`

### Step 4: Set Environment Variables

#### Using Vercel CLI:

```bash
# Add Anthropic API key (REQUIRED)
printf "your_anthropic_api_key_here" | vercel env add ANTHROPIC_API_KEY production

# Add LangChain API key (OPTIONAL - for tracing)
printf "your_langchain_api_key_here" | vercel env add LANGCHAIN_API_KEY production
```

**Important**: Use `printf` instead of `echo` to avoid adding newline characters to your API keys.

#### Using Vercel Dashboard:

1. Go to [vercel.com](https://vercel.com)
2. Select your project
3. Go to Settings → Environment Variables
4. Add:
   - `ANTHROPIC_API_KEY`: Your Anthropic API key
   - `LANGCHAIN_API_KEY`: Your LangChain API key (optional)

### Step 5: Deploy to Production

```bash
vercel --prod
```

Your application will be live at: `https://[project-name].vercel.app`

## Custom Domain Setup

### Adding a Custom Subdomain

1. In Vercel Dashboard, go to your project
2. Go to Settings → Domains
3. Add your domain (e.g., `ai-bot-special.lenilani.com`)
4. Add the following DNS records to your domain provider:

For subdomain:
```
Type: CNAME
Name: ai-bot-special
Value: cname.vercel-dns.com
TTL: 3600
```

For apex domain:
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600
```

### Verify Domain

After adding DNS records:
1. Wait 5-30 minutes for DNS propagation
2. Vercel will automatically provision SSL certificate
3. Your site will be accessible at your custom domain

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | `sk-ant-api03-...` |

### Optional Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `LANGCHAIN_API_KEY` | LangChain API key for tracing | `lsv2_pt_...` |
| `PORT` | Server port (local development only) | `3000` |
| `NODE_ENV` | Environment mode | `production` |

## Troubleshooting

### Common Issues and Solutions

#### 1. "Connection error" in chat

**Problem**: API key has newline character or is incorrectly formatted.

**Solution**:
```bash
# Remove and re-add the API key using printf
printf "your_api_key" | vercel env rm ANTHROPIC_API_KEY production --yes
printf "your_api_key" | vercel env add ANTHROPIC_API_KEY production
vercel --prod  # Redeploy
```

#### 2. Hero image not displaying

**Problem**: Static file routing not configured.

**Solution**: Ensure `vercel.json` includes:
```json
{
  "routes": [
    {"src": "/hero-bg.png", "dest": "/public/hero-bg.png"},
    {"src": "/favicon.svg", "dest": "/public/favicon.svg"}
  ]
}
```

#### 3. "API key not configured" error

**Problem**: Environment variables not loaded.

**Solution**:
1. Verify environment variables are set: `vercel env ls`
2. Redeploy: `vercel --prod`
3. Check logs: `vercel logs [deployment-url]`

#### 4. CORS errors

**Problem**: Cross-origin requests blocked.

**Solution**: Ensure `cors` middleware is configured in `index.js`:
```javascript
app.use(cors());
```

### Viewing Logs

To debug issues:

```bash
# View recent logs
vercel logs [deployment-url]

# View logs for specific deployment
vercel logs dpl_xxxxxxxxxxxxx
```

## Alternative Platforms

### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway add
railway up
```

### Heroku

1. Create `Procfile`:
```
web: node index.js
```

2. Deploy:
```bash
heroku create lenilani-ai
heroku config:set ANTHROPIC_API_KEY=your_key
git push heroku main
```

### AWS EC2

1. SSH into your EC2 instance
2. Clone repository
3. Install Node.js and npm
4. Set up PM2 for process management:
```bash
npm install -g pm2
pm2 start index.js --name lenilani-ai
pm2 save
pm2 startup
```

### Docker

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

Build and run:
```bash
docker build -t lenilani-ai .
docker run -p 3000:3000 --env-file .env lenilani-ai
```

## Production Checklist

Before going live, ensure:

- [ ] API keys are securely stored as environment variables
- [ ] Custom domain is configured and SSL is active
- [ ] Error handling is properly configured
- [ ] Logs are accessible for debugging
- [ ] Test chat functionality on production URL
- [ ] Verify dark/light mode toggle works
- [ ] Test on mobile devices
- [ ] Pricing calculator displays correctly
- [ ] Contact information is accurate

## Monitoring

### Using LangSmith (Optional)

If you have a LangChain API key configured:

1. Visit [smith.langchain.com](https://smith.langchain.com)
2. View your project: `lenilani-ai`
3. Monitor:
   - Conversation traces
   - Token usage
   - Response times
   - Error rates

### Vercel Analytics

Enable analytics in Vercel Dashboard:
1. Go to your project
2. Navigate to Analytics tab
3. Enable Web Analytics
4. Add tracking script to your HTML files

## Support

For deployment issues:
- Check Vercel status: [status.vercel.com](https://status.vercel.com)
- Review documentation: [vercel.com/docs](https://vercel.com/docs)
- Contact LeniLani Consulting: (815) 641-6689

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Enable HTTPS** (automatic with Vercel)
4. **Implement rate limiting** for production
5. **Monitor usage** through LangSmith or custom logging
6. **Regular updates** of dependencies
7. **Backup** your environment variables

---

© 2025 LeniLani Consulting. Deployment guide for LeniLani AI.