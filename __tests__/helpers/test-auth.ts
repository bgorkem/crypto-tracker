/**
 * Test authentication helper
 * Handles registration or login for test pool users
 */

const BASE_URL = 'http://localhost:3000';

export interface AuthResult {
  token: string;
  email: string;
}

/**
 * Register or login a test user
 * If user exists, logs in instead of failing
 */
export async function authenticateTestUser(
  email: string,
  password: string
): Promise<AuthResult> {
  // Try to register first
  const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const registerData = await registerResponse.json();

  // If registration successful
  if (registerData.data?.session?.access_token) {
    return {
      token: registerData.data.session.access_token,
      email,
    };
  }

  // If user already exists, try to login
  if (registerData.error?.code === 'EMAIL_EXISTS') {
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const loginData = await loginResponse.json();

    if (loginData.data?.session?.access_token) {
      return {
        token: loginData.data.session.access_token,
        email,
      };
    }

    throw new Error(`Login failed: ${JSON.stringify(loginData, null, 2)}`);
  }

  // Other registration error
  throw new Error(`Authentication failed: ${JSON.stringify(registerData, null, 2)}`);
}
