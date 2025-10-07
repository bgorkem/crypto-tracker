# 🚀 Production Deployment Guide - Vercel

## Prerequisites Checklist

- [ ] GitHub account
- [ ] Vercel account (sign up at https://vercel.com)
- [ ] Supabase project (production instance)
- [ ] Moralis API key

---

## Step 1: Configure Supabase for Production

### 1.1 Email Confirmation Settings

Go to your Supabase project dashboard:
1. Navigate to **Authentication** → **Settings** → **Auth Settings**
2. Set **Site URL**: `https://your-app.vercel.app` (you'll update this after deployment)
3. Add to **Redirect URLs**:
   - `https://your-app.vercel.app/**`
   - `http://localhost:3000/**` (for local dev)

### 1.2 Enable Email Confirmation (IMPORTANT!)

1. Go to **Authentication** → **Email Templates**
2. Enable **Confirm signup** email template
3. Customize the email template (optional):
   ```html
   <h2>Confirm your email</h2>
   <p>Follow this link to confirm your email:</p>
   <p><a href="{{ .ConfirmationURL }}">Confirm Email</a></p>
   ```

4. **Email Provider** (Choose one):

   **Option A: Use Supabase's built-in email (Development only)**
   - Already configured, but limited to 4 emails/hour
   - Fine for testing, not for production

   **Option B: Configure Custom SMTP (Recommended for Production)**
   1. Go to **Project Settings** → **Auth** → **SMTP Settings**
   2. Configure your email provider (Gmail, SendGrid, AWS SES, etc.):
      - **Host**: smtp.gmail.com (for Gmail)
      - **Port**: 587
      - **User**: your-email@gmail.com
      - **Password**: your-app-password
      - **Sender email**: your-email@gmail.com
      - **Sender name**: CryptoTracker

### 1.3 Get Production Environment Variables

From your Supabase dashboard:
1. Go to **Project Settings** → **API**
2. Copy these values:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (⚠️ KEEP SECRET!)

---

## Step 2: Prepare Repository for Deployment

### 2.1 Create .env.example

Create a template file so others know what env vars are needed:

```bash
# Copy to .env.local and fill in your values

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Moralis API Configuration
MORALIS_API_KEY=

# Application Configuration
NEXT_PUBLIC_APP_URL=

# Environment Configuration
NODE_ENV=production
```

### 2.2 Ensure .gitignore is Correct

Verify these files are in `.gitignore`:
```
.env*.local
.env
.vercel
```

### 2.3 Push to GitHub

```bash
# If you haven't already
git add .
git commit -m "chore: prepare for production deployment"
git push origin main
```

---

## Step 3: Deploy to Vercel

### 3.1 Connect Repository

1. Go to https://vercel.com
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Select the repository: `crypto-tracker`

### 3.2 Configure Project

**Framework Preset**: Next.js (auto-detected)  
**Root Directory**: `./` (leave as default)  
**Build Command**: `npm run build` (auto-detected)  
**Output Directory**: `.next` (auto-detected)

### 3.3 Add Environment Variables

Click **"Environment Variables"** and add:

```bash
# Supabase (from Step 1.3)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Moralis
MORALIS_API_KEY=eyJhbGc...

# App URL (update after first deployment)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Environment
NODE_ENV=production

# ⚠️ IMPORTANT: DO NOT SET THESE IN PRODUCTION
# TEST_MODE=false
# NEXT_PUBLIC_TEST_MODE=false
```

**Important**: 
- ✅ Add to **Production**, **Preview**, and **Development** environments
- ⚠️ Never commit secrets to git
- ⚠️ Don't enable TEST_MODE in production

### 3.4 Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for build to complete
3. You'll get a URL like: `https://crypto-tracker-xxx.vercel.app`

---

## Step 4: Post-Deployment Configuration

### 4.1 Update Supabase with Production URL

1. Go back to Supabase → **Authentication** → **URL Configuration**
2. Update **Site URL**: `https://crypto-tracker-xxx.vercel.app`
3. Ensure Redirect URLs include:
   - `https://crypto-tracker-xxx.vercel.app/**`
   - `http://localhost:3000/**`

### 4.2 Update Environment Variables in Vercel

1. Go to Vercel project → **Settings** → **Environment Variables**
2. Update `NEXT_PUBLIC_APP_URL`:
   ```
   NEXT_PUBLIC_APP_URL=https://crypto-tracker-xxx.vercel.app
   ```
3. Click **"Save"**
4. Redeploy: **Deployments** → **︙** → **Redeploy**

### 4.3 Test Production Deployment

1. **Test Registration Flow**:
   - Go to `https://your-app.vercel.app/auth/register`
   - Register with a real email
   - Check email for confirmation link
   - Click confirmation link
   - Verify you can login

2. **Test Core Features**:
   - ✅ Login/Logout
   - ✅ Create portfolio
   - ✅ Add transactions
   - ✅ View real-time prices
   - ✅ Charts display correctly
   - ✅ Header/Footer appear

3. **Check Console for Errors**:
   - Open browser DevTools (F12)
   - Look for any errors in Console
   - Verify API calls succeed

---

## Step 5: Custom Domain (Optional)

### 5.1 Add Domain in Vercel

1. Go to **Settings** → **Domains**
2. Add your domain: `cryptotracker.com`
3. Follow DNS configuration instructions

### 5.2 Update Supabase URLs

Add your custom domain to:
- Site URL: `https://cryptotracker.com`
- Redirect URLs: `https://cryptotracker.com/**`

---

## 🔧 Troubleshooting

### Issue: "Email not confirmed" error

**Solution**: 
1. Check Supabase → Authentication → Users
2. Manually confirm user if needed
3. Verify email template is enabled
4. Check SMTP settings if using custom email

### Issue: "Invalid redirect URL" error

**Solution**:
1. Ensure production URL is in Supabase Redirect URLs
2. Format: `https://your-app.vercel.app/**` (with `/**`)
3. Redeploy after updating

### Issue: Price data not loading

**Solution**:
1. Verify `MORALIS_API_KEY` is set in Vercel
2. Check browser console for API errors
3. Ensure API key has sufficient quota

### Issue: "Module not found" build error

**Solution**:
```bash
# Locally verify build works
npm run build

# If successful, redeploy to Vercel
```

### Issue: Database connection errors

**Solution**:
1. Verify Supabase project is running (not paused)
2. Check environment variables are correct
3. Ensure service role key is set (for server-side calls)

---

## 📊 Monitoring Production

### Vercel Analytics
- Enable at: **Analytics** tab in Vercel dashboard
- Track: Page views, performance, errors

### Supabase Logs
- **Database**: Project → Database → Logs
- **Auth**: Project → Authentication → Logs
- **API**: Project → API → Logs

### Error Tracking (Optional)
Consider adding:
- **Sentry**: Error tracking
- **LogRocket**: Session replay
- **PostHog**: Product analytics

---

## 🚀 Continuous Deployment

Every push to `main` branch will automatically:
1. Build the app
2. Run type checking
3. Deploy to production

For staging environment:
1. Create `staging` branch
2. Vercel auto-creates preview deployment
3. Test before merging to `main`

---

## 📝 Production Checklist

Before going live:

- [ ] Email confirmation working
- [ ] SMTP configured (not using Supabase default)
- [ ] All environment variables set correctly
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active (auto via Vercel)
- [ ] Database migrations run
- [ ] Test user registration flow
- [ ] Test portfolio creation
- [ ] Test transaction management
- [ ] Verify real-time price updates
- [ ] Check all pages load correctly
- [ ] Monitor logs for errors
- [ ] Set up error tracking (optional)
- [ ] Configure backups (Supabase auto-backups)

---

## 🔐 Security Best Practices

1. **Never commit secrets**:
   - ✅ Use environment variables
   - ✅ Keep `.env.local` in `.gitignore`

2. **Rotate keys periodically**:
   - Service role key every 90 days
   - API keys every 6 months

3. **Monitor auth logs**:
   - Check for suspicious login attempts
   - Enable rate limiting in Supabase

4. **Enable RLS (Row Level Security)**:
   - Already configured in migrations
   - Verify policies are active

5. **HTTPS only**:
   - ✅ Vercel provides auto-HTTPS
   - Set `Strict-Transport-Security` headers

---

## 📞 Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js 15 Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **Moralis Docs**: https://docs.moralis.io

Need help? Check:
1. Vercel deployment logs
2. Supabase auth logs  
3. Browser console errors
4. This repository's Issues tab
