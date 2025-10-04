/**
 * POST /api/auth/login
 * Authenticate user with email and password
 * 
 * @contract T010: Login with valid credentials → 200 + session token
 * @contract T011: Login with invalid credentials → 401 error
 */

import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { LoginSchema } from '@/lib/validation'
import { successResponse, unauthorizedResponse, handleValidationError, internalErrorResponse } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const validation = LoginSchema.safeParse(body)
    if (!validation.success) {
      return handleValidationError(validation.error)
    }

    const { email, password } = validation.data

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError || !authData.user) {
      return unauthorizedResponse('INVALID_CREDENTIALS', 'Invalid email or password')
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      console.error('Failed to fetch user profile:', profileError)
    }

    // Return session and user data
    return successResponse({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        displayName: profile?.display_name || null,
        avatarUrl: profile?.avatar_url || null
      },
      session: {
        accessToken: authData.session?.access_token,
        refreshToken: authData.session?.refresh_token,
        expiresAt: authData.session?.expires_at
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return internalErrorResponse()
  }
}
