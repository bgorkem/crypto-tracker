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
import { successResponse, conflictResponse, badRequestResponse, internalErrorResponse, handleValidationError } from '@/lib/api-response'
import { sanitizeInput } from '@/lib/sanitize'

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

    // Use admin client for registration (bypasses email confirmation)
    const adminClient = createAdminClient()

    // Register user with Supabase Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for development
      user_metadata: {
        display_name: sanitizedDisplayName
      }
    })

    if (authError) {
      // Check if user already exists (duplicate email)
      const errorMsg = authError.message.toLowerCase();
      if (errorMsg.includes('already registered') || 
          errorMsg.includes('already been registered') ||
          errorMsg.includes('duplicate') ||
          errorMsg.includes('already exists')) {
        return conflictResponse('EMAIL_EXISTS', 'User with this email already exists')
      }
      return badRequestResponse('REGISTRATION_FAILED', authError.message)
    }

    if (!authData.user) {
      return internalErrorResponse('Failed to create user')
    }

    // Create user profile in our database
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: authData.user.email!,
        display_name: sanitizedDisplayName,
        avatar_url: null
      })

    if (profileError) {
      // If profile creation fails, we should ideally rollback the auth user
      // But Supabase doesn't support transactions across auth and database
      console.error('Failed to create user profile:', profileError)
      return internalErrorResponse('Failed to create user profile')
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
            id: authData.user.id,
            email: authData.user.email!,
            created_at: authData.user.created_at
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
          id: authData.user.id,
          email: authData.user.email!,
          created_at: authData.user.created_at
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
