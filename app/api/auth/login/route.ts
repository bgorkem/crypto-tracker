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

    // Return session and user data
    return successResponse({
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        created_at: authData.user.created_at
      },
      session: {
        access_token: authData.session?.access_token || '',
        refresh_token: authData.session?.refresh_token || '',
        expires_at: authData.session?.expires_at || 0
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return internalErrorResponse()
  }
}
