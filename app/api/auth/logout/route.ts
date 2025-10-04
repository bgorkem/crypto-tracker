/**
 * POST /api/auth/logout
 * Terminate user session
 * 
 * @contract T013: Logout with valid session → 200 success
 */

import { NextRequest } from 'next/server'
import { validateAuth } from '@/middleware/auth'
import { noContentResponse, unauthorizedResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'
import { createAuthenticatedClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const authResult = await validateAuth(request)
    if (!authResult.success || !authResult.userId) {
      return unauthorizedResponse(
        authResult.error?.code || 'UNAUTHORIZED',
        authResult.error?.message || 'Authentication required'
      )
    }

    // Extract token from header
    const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim()
    if (!token) {
      return unauthorizedResponse()
    }

    // Create authenticated client and sign out
    const supabase = createAuthenticatedClient(token)
    const { error } = await supabase.auth.signOut()

    if (error) {
      return badRequestResponse('LOGOUT_FAILED', error.message)
    }

    return noContentResponse()

  } catch (error) {
    console.error('Logout error:', error)
    return internalErrorResponse()
  }
}
