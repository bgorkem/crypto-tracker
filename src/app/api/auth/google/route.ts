/**
 * POST /api/auth/google
 * Initiate Google OAuth flow or handle OAuth callback
 * 
 * @contract T012: Google OAuth flow → 200 + redirect URL or session
 */

import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { successResponse, badRequestResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api-response'

/**
 * Initiate Google OAuth flow
 */
async function initiateOAuthFlow() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
    }
  })

  if (error) {
    return badRequestResponse('OAUTH_INIT_FAILED', error.message)
  }

  return successResponse({
    url: data.url
  })
}

/**
 * Handle OAuth callback and create user session
 */
async function handleOAuthCallback(code: string) {
  const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code)

  if (authError || !authData.user) {
    return unauthorizedResponse('OAUTH_FAILED', 'Failed to authenticate with Google')
  }

  // Check if user profile exists, create if not
  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single()

  if (!existingProfile) {
    // Create profile for new Google user
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: authData.user.email!,
        display_name: authData.user.user_metadata?.full_name || null,
        avatar_url: authData.user.user_metadata?.avatar_url || null
      })

    if (profileError) {
      console.error('Failed to create user profile:', profileError)
      return internalErrorResponse('Failed to create user profile')
    }
  }

  // Return session and user data
  return successResponse({
    user: {
      id: authData.user.id,
      email: authData.user.email,
      displayName: authData.user.user_metadata?.full_name || null,
      avatarUrl: authData.user.user_metadata?.avatar_url || null
    },
    session: {
      accessToken: authData.session?.access_token,
      refreshToken: authData.session?.refresh_token,
      expiresAt: authData.session?.expires_at
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, code } = body

    if (action === 'initiate') {
      return await initiateOAuthFlow()
    } else if (action === 'callback') {
      if (!code) {
        return badRequestResponse('MISSING_CODE', 'Authorization code required')
      }
      return await handleOAuthCallback(code)
    } else {
      return badRequestResponse('INVALID_ACTION', 'Invalid action. Use "initiate" or "callback"')
    }

  } catch (error) {
    console.error('Google OAuth error:', error)
    return internalErrorResponse()
  }
}
