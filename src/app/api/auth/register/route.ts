/**
 * POST /api/auth/register
 * Register a new user with email and password
 * 
 * @contract T007: Register with valid email/password → 201 + user object
 * @contract T008: Register with existing email → 400 error
 * @contract T009: Register with invalid email → 400 validation error
 */

import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { RegisterSchema } from '@/lib/validation'
import { successResponse, badRequestResponse, internalErrorResponse, handleValidationError } from '@/lib/api-response'
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

    // Register user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: sanitizedDisplayName
        }
      }
    })

    if (authError) {
      // Check if user already exists
      if (authError.message.includes('already registered')) {
        return badRequestResponse('USER_EXISTS', 'User with this email already exists')
      }
      return badRequestResponse('REGISTRATION_FAILED', authError.message)
    }

    if (!authData.user) {
      return internalErrorResponse('Failed to create user')
    }

    // Create user profile in our database
    const { error: profileError } = await supabase
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

    // Return user data (excluding sensitive info)
    return successResponse(
      {
        id: authData.user.id,
        email: authData.user.email,
        displayName: sanitizedDisplayName,
        createdAt: authData.user.created_at
      },
      201
    )

  } catch (error) {
    console.error('Registration error:', error)
    return internalErrorResponse()
  }
}
