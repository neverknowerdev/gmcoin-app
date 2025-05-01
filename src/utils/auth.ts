// Utilities for Twitter OAuth authentication

/**
 * Generates a code verifier for OAuth PKCE flow
 * @returns A random string of 43-128 characters
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(64);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => 
    ('0' + (byte & 0xff).toString(16)).slice(-2)
  ).join('').substring(0, 128);
}

/**
 * Generates a code challenge from a code verifier using SHA-256 hashing
 * @param codeVerifier The code verifier to hash
 * @returns The code challenge string
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  // Hash the verifier using SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  
  // Convert the hash to base64-url format
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
} 