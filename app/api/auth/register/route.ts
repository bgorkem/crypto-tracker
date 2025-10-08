/**
 * POST /api/auth/register
 * Register a new user with email and password
 * 
 * @contract T007: Register with valid email/password → 201 + user object
 * @contract T008: Register with existing email → 400 error
 * @contract T009: Register with invalid email → 400 validation error
 */

import { NextRequest } from 'next/server'
import { createAdminClient, supabase as anonClient } from '@/lib/supabase'
import { RegisterSchema } from '@/lib/validation'
import { successResponse, conflictResponse, internalErrorResponse, handleValidationError } from '@/lib/api-response'
import { sanitizeInput } from '@/lib/sanitize'

// TODO: Refactor this to reduce complexity
// eslint-disable-next-line complexity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const validation = RegisterSchema.safeParse(body)
    if (!validation.success) {
      return handleValidationError(validation.error)
    }

    const { email, password, displayName } = validation.data

    // Sanitize display name to prevent XSS
    const sanitizedDisplayName = displayName ? sanitizeInput(displayName) : null

    // SECURITY: Only use admin client in test mode to bypass email confirmation
    // In production, this will use normal signup flow with email confirmation
    const isTestMode = process.env.TEST_MODE === 'true'
    
    if (isTestMode && process.env.NODE_ENV === 'production') {
      console.warn('⚠️  WARNING: TEST_MODE is enabled in production! This is a security risk.')
    }
    
    let authData;
    let authError;

    if (isTestMode) {
      // TEST MODE: Use admin client to bypass email confirmation for integration tests
      const adminClient = createAdminClient()
      const result = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: sanitizedDisplayName
        }
      })
      authData = result.data
      authError = result.error
    } else {
      // PRODUCTION: Normal signup flow with email confirmation
      const result = await anonClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: sanitizedDisplayName
          }
        }
      })
      authData = result.data
      authError = result.error
    }

    if (authError) {
      // Check if the error is due to duplicate email
      if (authError.message?.includes('already registered')) {
        return conflictResponse('User already exists')
      }
      console.error('Failed to create user:', authError)
      return internalErrorResponse('Failed to create user')
    }

    // User profile is automatically created by database trigger (handle_new_user)
    // No need to manually insert - just update display_name if provided
    if (sanitizedDisplayName && authData.user) {
      const supabaseClient = isTestMode ? createAdminClient() : anonClient
      const { error: profileError } = await supabaseClient
        .from('user_profiles')
        .update({ display_name: sanitizedDisplayName })
        .eq('id', authData.user.id)

      if (profileError) {
        console.error('Failed to update user profile display name:', profileError)
        // Don't fail registration - display name can be set later
      }
    }

    // Create a session for the user (sign them in automatically)
    const { data: sessionData, error: sessionError } = await anonClient.auth.signInWithPassword({
      email,
      password,
    })

    if (sessionError) {
      console.error('Failed to create session:', sessionError)
      // User is created but not signed in - they can still login manually
      return successResponse(
        {
          user: {
            id: authData.user?.id || '',
            email: authData.user?.email || email,
            created_at: authData.user?.created_at || new Date().toISOString()
          },
          session: null
        },
        201
      )
    }

    // Return user and session data
    return successResponse(
      {
        user: {
          id: authData.user?.id || sessionData.user.id,
          email: authData.user?.email || sessionData.user.email || email,
          created_at: authData.user?.created_at || sessionData.user.created_at
        },
        session: {
          access_token: sessionData.session?.access_token || '',
          refresh_token: sessionData.session?.refresh_token || '',
          expires_at: sessionData.session?.expires_at || 0
        }
      },
      201
    )

  } catch (error) {
    console.error('Registration error:', error)
    return internalErrorResponse()
  }
}
