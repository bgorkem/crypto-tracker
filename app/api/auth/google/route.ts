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
// TODO: Refactor to reduce complexity
// eslint-disable-next-line complexity
async function handleOAuthCallback(code: string) {
  const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code)

  if (authError || !authData.user) {
    return unauthorizedResponse('OAUTH_FAILED', 'Failed to authenticate with Google')
  }

  // User profile is automatically created by database trigger (handle_new_user)
  // Just update display_name and avatar_url from Google metadata if provided
  const displayName = authData.user.user_metadata?.full_name || null
  const avatarUrl = authData.user.user_metadata?.avatar_url || null

  if (displayName || avatarUrl) {
    const updateData: { display_name?: string | null; avatar_url?: string | null } = {}
    if (displayName) updateData.display_name = displayName
    if (avatarUrl) updateData.avatar_url = avatarUrl

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', authData.user.id)

    if (profileError) {
      console.error('Failed to update user profile from Google metadata:', profileError)
      // Don't fail authentication - profile data can be updated later
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
    const body = await request.json().catch(() => ({}))
    const { action, code } = body

    // Default to initiate if no action specified
    if (!action || action === 'initiate') {
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
