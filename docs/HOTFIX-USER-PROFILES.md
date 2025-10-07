# 🔥 HOTFIX: User Profile Creation Issue

## Problem
Users can register but cannot create portfolios. Error:
```
insert or update on table "portfolios" violates foreign key constraint "portfolios_user_id_fkey"
Key is not present in table "user_profiles".
```

## Root Cause
When users register via Supabase Auth, they're added to `auth.users` but NOT to `user_profiles` table. The portfolios table requires a matching record in `user_profiles`.

## Solution
Create a database trigger that automatically creates `user_profiles` records when users sign up.

---

## 🚨 IMMEDIATE FIX (2 minutes)

### Step 1: Apply SQL Patch

1. Go to your Supabase Dashboard: https://app.supabase.com/project/hypcnmhuemqtlsxmfzbc/sql/new

2. Copy and paste this SQL:

```sql
-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Fix existing users (create missing user_profiles)
INSERT INTO public.user_profiles (id, email, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  au.created_at,
  au.updated_at
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- 4. Verify it worked
SELECT 
  COUNT(*) as total_auth_users,
  (SELECT COUNT(*) FROM public.user_profiles) as total_user_profiles
FROM auth.users;
```

3. Click **"Run"**

4. Verify the last query shows matching counts:
   - `total_auth_users` = `total_user_profiles` ✅

### Step 2: Test

1. Try creating a portfolio with your existing user
2. Should work now! ✅

---

## 📋 What This Does

1. **Creates a trigger function** (`handle_new_user`)
   - Automatically runs when a new user signs up
   - Creates matching `user_profiles` record

2. **Creates the trigger** (`on_auth_user_created`)
   - Fires AFTER INSERT on `auth.users`
   - Calls `handle_new_user()` function

3. **Fixes existing users**
   - Finds users in `auth.users` without `user_profiles` records
   - Creates missing records
   - Your current user should now work!

4. **Verifies the fix**
   - Counts should match
   - All future signups will work automatically

---

## ✅ Testing

After applying the fix:

1. **Test existing user**:
   - Login with your registered user
   - Try to create a portfolio
   - Should work! ✅

2. **Test new user**:
   - Register a new account
   - Confirm email
   - Login
   - Create portfolio
   - Should work! ✅

---

## 🔍 Why This Happened

The initial migration (`20240101000000_initial_schema.sql`) created the `user_profiles` table but didn't include a trigger to populate it automatically during signup. This is a common issue when:

1. Database schema is created manually
2. Supabase Auth is added later
3. Missing the auth → profile sync trigger

This hotfix adds the missing trigger that should have been in the initial setup.

---

## 📝 Long-term Fix

The migration file has been added to the repository:
- `supabase/migrations/20250107000000_auto_create_user_profile.sql`

For future deployments or new projects, this migration will be included automatically.

---

## ⚠️ Important Notes

1. **Apply to production first** (you just did this)
2. **Commit the migration** to git (done)
3. **All future users** will have profiles created automatically
4. **Existing users** are now fixed

---

## 🎯 Verification Queries

Run these in Supabase SQL Editor to verify:

```sql
-- Check all users have profiles
SELECT 
  au.email,
  CASE WHEN up.id IS NOT NULL THEN 'Has Profile ✅' ELSE 'Missing Profile ❌' END as status
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
ORDER BY au.created_at DESC;

-- Should show ✅ for all users
```

```sql
-- Check trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Should return one row
```

---

## 🚀 Status: FIXED

After applying the SQL above:
- ✅ Existing users can create portfolios
- ✅ New users will automatically get profiles
- ✅ No code changes needed
- ✅ Production is now stable
