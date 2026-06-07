/**
 * B2B Authentication & Session Management
 * 
 * PRODUCTION MODULE - Handles automatic re-authentication
 * for b2b.mo.ro supplier portal.
 * 
 * Features:
 * - Automatic login with stored credentials
 * - Session cookie management  
 * - Auto re-auth on session expiry
 * - Singleton pattern for session reuse
 */

// B2B Credentials - sourced from ~/.secure/master-credentials.txt
const B2B_CONFIG = {
  baseUrl: 'https://b2b.mo.ro',
  loginUrl: 'https://b2b.mo.ro/account/login',
  username: 'statiiinfo',
  password: '',
  sessionMaxAge: 3600000, // 1 hour in ms (conservative - actual is ~24h)
};

interface B2BSession {
  cookies: string;
  csrfToken: string | null;
  lastLogin: number;
  isValid: boolean;
}

// Global session storage (singleton)
let currentSession: B2BSession | null = null;

/**
 * Perform login to B2B portal and get session cookies
 */
export async function loginToB2B(): Promise<B2BSession> {
  console.log('[B2B-Auth] Attempting login...');
  
  try {
    // Step 1: Get login page to initialize session
    const loginPageResponse = await fetch(B2B_CONFIG.loginUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
      },
    });
    
    // Extract Set-Cookie headers
    const setCookies = loginPageResponse.headers.getSetCookie?.() || [];
    let sessionCookies: string[] = [];
    
    for (const cookie of setCookies) {
      const cookieName = cookie.split('=')[0];
      const cookieValue = cookie.split(';')[0];
      sessionCookies.push(cookieValue);
    }
    
    // If no getSetCookie method, try raw header
    if (sessionCookies.length === 0) {
      const rawCookie = loginPageResponse.headers.get('set-cookie');
      if (rawCookie) {
        sessionCookies = rawCookie.split(',').map(c => c.split(';')[0].trim());
      }
    }
    
    const initialCookies = sessionCookies.join('; ');
    console.log('[B2B-Auth] Initial cookies obtained');
    
    // Step 2: Perform login POST
    const formData = new URLSearchParams({
      username: B2B_CONFIG.username,
      password: B2B_CONFIG.password,
      step: '1',
    });
    
    const loginResponse = await fetch(B2B_CONFIG.loginUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Origin': B2B_CONFIG.baseUrl,
        'Referer': B2B_CONFIG.loginUrl,
        'Cookie': initialCookies,
      },
      body: formData.toString(),
      redirect: 'manual',
    });
    
    // Collect all cookies from login response
    const loginSetCookies = loginResponse.headers.getSetCookie?.() || [];
    for (const cookie of loginSetCookies) {
      const cookieValue = cookie.split(';')[0];
      if (!sessionCookies.includes(cookieValue)) {
        sessionCookies.push(cookieValue);
      }
    }
    
    // Check if login was successful (redirect to home or 302)
    const location = loginResponse.headers.get('location');
    const isSuccess = loginResponse.status === 302 || 
                      (location && location.includes('/account/home'));
    
    // If not redirect, check final URL or response body
    if (!isSuccess && loginResponse.status === 200) {
      const text = await loginResponse.text();
      if (text.includes('/account/logout') || text.includes('Bun venit')) {
        console.log('[B2B-Auth] Login successful (detected from response body)');
      } else if (text.includes('account/login') && text.includes('error')) {
        throw new Error('B2B Login failed - invalid credentials');
      }
    }
    
    const finalCookies = sessionCookies.join('; ');
    
    const session: B2BSession = {
      cookies: finalCookies,
      csrfToken: null,
      lastLogin: Date.now(),
      isValid: true,
    };
    
    // Store session globally
    currentSession = session;
    
    console.log('[B2B-Auth] Login successful, session stored');
    return session;
    
  } catch (error) {
    console.error('[B2B-Auth] Login failed:', error);
    throw error;
  }
}

/**
 * Get current valid session, auto re-auth if expired
 */
export async function getB2BSession(): Promise<B2BSession> {
  const now = Date.now();
  
  // Check if current session is valid
  if (currentSession && currentSession.isValid) {
    const sessionAge = now - currentSession.lastLogin;
    
    if (sessionAge < B2B_CONFIG.sessionMaxAge) {
      console.log('[B2B-Auth] Using existing session');
      return currentSession;
    }
    
    console.log('[B2B-Auth] Session expired, re-authenticating...');
  }
  
  // Login and get new session
  return await loginToB2B();
}

/**
 * Invalidate current session (call on 401 or auth errors)
 */
export function invalidateB2BSession(): void {
  if (currentSession) {
    currentSession.isValid = false;
    console.log('[B2B-Auth] Session invalidated');
  }
}

/**
 * Make authenticated request to B2B
 * Auto re-authenticates on session expiry
 */
export async function fetchB2BWithAuth(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  let session = await getB2BSession();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
      ...options.headers,
      'Cookie': session.cookies,
    },
  });
  
  // Check if response indicates auth failure
  if (response.status === 401 || response.status === 403) {
    console.log('[B2B-Auth] Auth failed, re-authenticating...');
    invalidateB2BSession();
    session = await getB2BSession();
    
    // Retry request with new session
    return fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...options.headers,
        'Cookie': session.cookies,
      },
    });
  }
  
  // Check if redirected to login page
  const text = await response.clone().text();
  if (text.includes('account/login') && text.includes('<form')) {
    console.log('[B2B-Auth] Redirected to login, re-authenticating...');
    invalidateB2BSession();
    session = await getB2BSession();
    
    // Retry request
    return fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...options.headers,
        'Cookie': session.cookies,
      },
    });
  }
  
  return response;
}

/**
 * Get B2B config (for external use)
 */
export function getB2BConfig() {
  return {
    baseUrl: B2B_CONFIG.baseUrl,
    productsUrl: `${B2B_CONFIG.baseUrl}/products/home`,
    productUrl: (id: string) => `${B2B_CONFIG.baseUrl}/product/${id}`,
    cdnUrl: 'https://cdn.mypni.com',
  };
}

export default {
  loginToB2B,
  getB2BSession,
  invalidateB2BSession,
  fetchB2BWithAuth,
  getB2BConfig,
};
