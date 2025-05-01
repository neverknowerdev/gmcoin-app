import { useState, useEffect, useCallback } from "react";
import { generateCodeVerifier, generateCodeChallenge } from "../utils/auth";
import { TWITTER_CLIENT_ID } from "../config";
import { STORAGE_KEYS } from "../constants/storage";

export interface TwitterAuthState {
  isAuthorized: boolean;
  isConnected: boolean;
  isLoading: boolean;
  twitterName: string | null;
  userId: string | null;
}

export const useTwitterAuth = () => {
  const [state, setState] = useState<TwitterAuthState>({
    isAuthorized: false,
    isConnected: false,
    isLoading: true,
    twitterName: null,
    userId: null,
  });

  const checkStoredAuth = useCallback(() => {
    const twitterUserId = localStorage.getItem(STORAGE_KEYS.TWITTER_USER_ID);
    const encryptedAccessToken = sessionStorage.getItem(STORAGE_KEYS.ENCRYPTED_ACCESS_TOKEN);
    const twitterName = localStorage.getItem(STORAGE_KEYS.TWITTER_NAME);
    const hasCompletedTx = localStorage.getItem(STORAGE_KEYS.HAS_COMPLETED_VERIFICATION);

    if (twitterUserId && encryptedAccessToken && twitterName) {
      setState((prev) => ({
        ...prev,
        isConnected: true,
        isAuthorized: hasCompletedTx === "true",
        twitterName,
        userId: twitterUserId,
        isLoading: false,
      }));
      return true;
    }
    
    setState((prev) => ({ ...prev, isLoading: false }));
    return false;
  }, []);

  const initiateAuth = useCallback(async () => {
    // Generate code verifier for PKCE flow
    const codeVerifier = generateCodeVerifier();
    sessionStorage.setItem(STORAGE_KEYS.VERIFIER, codeVerifier);

    // Generate code challenge from verifier
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Get current URI to use as redirect
    const redirectUri = encodeURIComponent(
      window.location.origin + window.location.pathname
    );
    
    // Save redirect URI for token exchange
    sessionStorage.setItem(STORAGE_KEYS.REDIRECT_URI, window.location.origin + window.location.pathname);

    // Generate state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem(STORAGE_KEYS.OAUTH_STATE, state);

    // Build Twitter authorization URL
    const authUrl = `https://x.com/i/oauth2/authorize?response_type=code&client_id=${TWITTER_CLIENT_ID}&redirect_uri=${redirectUri}&scope=users.read%20tweet.read&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    // Redirect to Twitter auth page
    window.location.href = authUrl;
  }, []);

  // Process the OAuth callback
  const processCallback = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const authorizationCode = params.get("code");
    const stateParam = params.get("state");
    
    // Verify state parameter to prevent CSRF
    const storedState = sessionStorage.getItem(STORAGE_KEYS.OAUTH_STATE);
    
    if (authorizationCode && stateParam && stateParam === storedState) {
      sessionStorage.setItem(STORAGE_KEYS.CODE, authorizationCode);
      sessionStorage.setItem(STORAGE_KEYS.AUTH_PROCESSING, "true");
      
      // Replace URL without parameters for cleaner UX
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      setState((prev) => ({ 
        ...prev, 
        isConnected: true 
      }));
      
      return authorizationCode;
    }
    
    return null;
  }, []);

  // Check if we have a code in the URL when the component mounts
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Check for OAuth redirect callback
    const hasCodeInUrl = window.location.search.includes("code=");
    const isAuthProcessing = sessionStorage.getItem(STORAGE_KEYS.AUTH_PROCESSING) === "true";
    
    if (hasCodeInUrl && !isAuthProcessing) {
      processCallback();
    } else {
      // Check for stored authentication
      checkStoredAuth();
    }
  }, [checkStoredAuth, processCallback]);

  return {
    ...state,
    initiateAuth,
    checkStoredAuth,
    processCallback,
  };
};
