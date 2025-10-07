# 🚀 Quick Deployment Checklist

Use this checklist to deploy to Vercel in ~10 minutes.

## Pre-Deployment (5 minutes)

- [ ] **Push to GitHub**
  ```bash
  git add .
  git commit -m "chore: prepare for production deployment"
  git push origin main
  ```

- [ ] **Get Supabase Production Credentials**
  - Go to: https://app.supabase.com/project/_/settings/api
  - Copy: `NEXT_PUBLIC_SUPABASE_URL`
  - Copy: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Copy: `SUPABASE_SERVICE_ROLE_KEY`

- [ ] **Get Moralis API Key**
  - Go to: https://admin.moralis.io/settings
  - Copy: `MORALIS_API_KEY`

## Vercel Deployment (3 minutes)

1. [ ] Go to https://vercel.com and sign in
2. [ ] Click **"Add New..."** → **"Project"**
3. [ ] Import your GitHub repository
4. [ ] **Add Environment Variables**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<your-value>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-value>
   SUPABASE_SERVICE_ROLE_KEY=<your-value>
   MORALIS_API_KEY=<your-value>
   NODE_ENV=production
   ```
5. [ ] Click **"Deploy"**
6. [ ] Wait 2-3 minutes
7. [ ] Copy your deployment URL (e.g., `https://crypto-tracker-xxx.vercel.app`)

## Post-Deployment Config (2 minutes)

- [ ] **Update Supabase URLs**
  1. Go to: Supabase → Authentication → URL Configuration
  2. Set **Site URL**: `https://crypto-tracker-xxx.vercel.app`
  3. Add **Redirect URL**: `https://crypto-tracker-xxx.vercel.app/**`
  4. Click Save

- [ ] **Update Vercel Environment Variable**
  1. Go to: Vercel Project → Settings → Environment Variables
  2. Update `NEXT_PUBLIC_APP_URL`: `https://crypto-tracker-xxx.vercel.app`
  3. Redeploy: Deployments → ︙ → Redeploy

## Email Configuration (Required for Signups!)

- [ ] **Enable Email Confirmation in Supabase**
  1. Go to: Authentication → Email Templates
  2. Enable **"Confirm signup"** template
  3. Save changes

- [ ] **Configure Email Provider** (Choose one):
  
  **Option A: Use Supabase Email (Quick, but limited)**
  - Already enabled
  - Limit: 4 emails/hour
  - OK for testing

  **Option B: Configure SMTP (Recommended)**
  1. Go to: Project Settings → Auth → SMTP Settings
  2. Example for Gmail:
     - Host: `smtp.gmail.com`
     - Port: `587`
     - User: `your-email@gmail.com`
     - Password: `your-app-password` (not regular password!)
     - Sender: `your-email@gmail.com`
  3. Save and enable

## Testing Production (2 minutes)

- [ ] **Test Registration Flow**
  1. Visit: `https://your-app.vercel.app/auth/register`
  2. Register with real email
  3. Check email inbox for confirmation
  4. Click confirmation link
  5. Login successfully

- [ ] **Test Core Features**
  - [ ] Create a portfolio
  - [ ] Add a transaction
  - [ ] View dashboard chart
  - [ ] Check real-time prices
  - [ ] Logout and login again

- [ ] **Check for Errors**
  - [ ] Open DevTools (F12)
  - [ ] Look for errors in Console
  - [ ] Verify no 404s in Network tab

## 🎉 You're Live!

Your app is now in production at: `https://your-app.vercel.app`

---

## 🆘 Common Issues

### "Email not confirmed" error
→ Check Supabase → Authentication → Users → Manually confirm if needed
→ Verify email template is enabled

### "Invalid redirect URL"
→ Add your Vercel URL to Supabase Redirect URLs with `/**` suffix
→ Format: `https://your-app.vercel.app/**`

### Prices not loading
→ Verify `MORALIS_API_KEY` is set in Vercel environment variables
→ Check browser console for API errors

### Build fails
→ Run `npm run build` locally first
→ Fix any TypeScript errors
→ Push changes and redeploy

---

## 📖 Full Guide

For detailed instructions, see: [docs/DEPLOYMENT.md](./DEPLOYMENT.md)
