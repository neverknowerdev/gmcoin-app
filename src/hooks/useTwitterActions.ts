import { useCallback } from "react";
import { TWITTER_CLIENT_ID, TOKEN_URL } from "@/src/config";
import { generateCodeVerifier, generateCodeChallenge } from "@/src/utils/auth";
import { STORAGE_KEYS } from "@/src/constants/storage";

interface TwitterActionsParams {
  setModalState?: (
    state: "loading" | "error" | "success" | "wrongNetwork" | null
  ) => void;
  setErrorMessage?: (message: string | null) => void;
  setTwitterName?: (name: string | null) => void;
  setVerifier?: (verifier: string) => void;
  setUser?: (name: string | null) => void;
}

export const useTwitterActions = (params: TwitterActionsParams = {}) => {
  const {
    setModalState,
    setErrorMessage,
    setTwitterName,
    setUser,
  } = params;
  
  const handleReconnectTwitter = useCallback(async () => {
    try {
      if (setModalState) setModalState("loading");
      console.log("Starting Twitter authorization process...");

      // Clear all previous authorization data
      sessionStorage.removeItem(STORAGE_KEYS.CODE);
      sessionStorage.removeItem(STORAGE_KEYS.VERIFIER);
      sessionStorage.removeItem(STORAGE_KEYS.AUTH_PROCESSED);
      sessionStorage.removeItem(STORAGE_KEYS.AUTH_PROCESSING);
      sessionStorage.removeItem(STORAGE_KEYS.REDIRECT_URI);
      sessionStorage.removeItem(STORAGE_KEYS.OAUTH_STATE);

      // Generate new code_verifier
      const codeVerifier = generateCodeVerifier();
      sessionStorage.setItem(STORAGE_KEYS.VERIFIER, codeVerifier);

      // Generate code_challenge
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      console.log("Generated code_challenge");

      // Generate state for CSRF protection
      const state =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem(STORAGE_KEYS.OAUTH_STATE, state);

      // Create redirect_uri based on current URL
      const redirectUri = window.location.origin + window.location.pathname;
      sessionStorage.setItem(STORAGE_KEYS.REDIRECT_URI, redirectUri);

      // Encode redirect_uri for URL
      const encodedRedirectUri = encodeURIComponent(redirectUri);

      // Form Twitter authorization URL
      const twitterAuthUrl = `https://x.com/i/oauth2/authorize?response_type=code&client_id=${TWITTER_CLIENT_ID}&redirect_uri=${encodedRedirectUri}&scope=users.read%20tweet.read&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

      console.log("Redirecting to Twitter authorization URL");

      // Redirect user to Twitter authorization page
      window.location.href = twitterAuthUrl;
    } catch (error) {
      console.error("Error while reconnecting Twitter:", error);
      if (setErrorMessage) setErrorMessage("Failed to reconnect Twitter");
      if (setModalState) setModalState("error");
    }
  }, [setErrorMessage, setModalState, setUser]);

  // Function for retry requests with delay
  const retryWithDelay = async (
    fn: () => Promise<any>,
    retries = 3,
    delay = 1000
  ) => {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }
      console.log(`Retrying in ${delay}ms, attempts remaining: ${retries}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryWithDelay(fn, retries - 1, delay * 1.5);
    }
  };

  const fetchTwitterAccessToken = useCallback(async (code: string, verifier: string) => {
    if (!TOKEN_URL) {
      console.error("TOKEN_URL is not defined in .env!");
      throw new Error("Server configuration error: TOKEN_URL is not defined");
    }

    // Check if this code was already processed
    const processedCodes = JSON.parse(
      sessionStorage.getItem(STORAGE_KEYS.PROCESSED_AUTH_CODES) || "[]"
    );
    if (processedCodes.includes(code)) {
      // Return username from localStorage if it exists
      const cachedUsername = localStorage.getItem(STORAGE_KEYS.TWITTER_NAME);
      if (cachedUsername) {
        return cachedUsername;
      }
    }

    // Get saved redirect_uri
    const redirectUri = sessionStorage.getItem(STORAGE_KEYS.REDIRECT_URI) ||
      window.location.origin + window.location.pathname;

    // Ensure redirect_uri doesn't contain extra parameters
    const cleanRedirectUri = redirectUri.split("?")[0];
    console.log("Using redirect_uri for token request:", cleanRedirectUri);

    // Generate unique request ID for tracking
    const requestId = `${code.substring(0, 5)}_${Date.now()}`;
    console.log(`Token request Twitter [${requestId}]`);

    try {
      // Add code to the list of processed codes to avoid duplicate requests
      if (!processedCodes.includes(code)) {
        processedCodes.push(code);
        sessionStorage.setItem(
          STORAGE_KEYS.PROCESSED_AUTH_CODES,
          JSON.stringify(processedCodes)
        );
      }

      // Add a small random delay to prevent race conditions
      const randomDelay = Math.floor(Math.random() * 100);
      await new Promise((resolve) => setTimeout(resolve, randomDelay));

      const requestBody = {
        authCode: code,
        verifier: verifier,
        redirectUri: cleanRedirectUri,
      };

      // Use retry function with fewer retries
      const data = await retryWithDelay(async () => {
        const response = await fetch(TOKEN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store",
            Pragma: "no-cache",
            "X-Request-ID": requestId,
          },
          body: JSON.stringify(requestBody),
        });

        console.log(`Response from server [${requestId}]:`, response.status);

        if (!response.ok) {
          let errorText;
          try {
            errorText = await response.text();
          } catch (e) {
            errorText = "Failed to get error text";
          }

          // If error is related to invalid code, don't retry
          if (
            errorText.includes("invalid_request") ||
            errorText.includes("authorization code") ||
            errorText.includes("Value passed for the authorization code was invalid")
          ) {
            throw new Error(`Authorization code is invalid: ${response.status}, ${errorText}`);
          }

          throw new Error(`HTTP error! Status: ${response.status}, Text: ${errorText}`);
        }

        let responseData;
        try {
          responseData = await response.json();
        } catch (e) {
          console.error(`Error parsing JSON [${requestId}]:`, e);
          throw new Error("Error parsing server response");
        }

        return responseData;
      }, 1);

      console.log(`Data received from server [${requestId}]:`, {
        username: data.username,
        user_id: data.user_id,
        hasAccessToken: !!data.access_token,
        hasEncryptedToken: !!data.encrypted_access_token,
      });

      if (!data || !data.username) {
        console.error(`Invalid response from server [${requestId}]:`, data);
        throw new Error("Invalid response from server");
      }

      // Save user data
      if (setTwitterName) setTwitterName(data.username);
      localStorage.setItem(STORAGE_KEYS.TWITTER_NAME, data.username);
      localStorage.setItem(STORAGE_KEYS.TWITTER_USER_ID, data.user_id);
      localStorage.setItem("isTwitterConnected", "true");
      localStorage.setItem("userAuthenticated", "true");

      // Save tokens
      if (data.encrypted_access_token) {
        localStorage.setItem("encryptedAccessToken", data.encrypted_access_token);
        sessionStorage.setItem(STORAGE_KEYS.ENCRYPTED_ACCESS_TOKEN, data.encrypted_access_token);
      }

      if (data.access_token) {
        localStorage.setItem("accessToken", data.access_token);
        sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
      }

      // Mark that authorization is successfully completed
      sessionStorage.setItem(STORAGE_KEYS.AUTH_PROCESSED, "true");
      sessionStorage.removeItem(STORAGE_KEYS.AUTH_PROCESSING);

      return data.username;
    } catch (error: any) {
      // If error is related to expired code, suggest user to re-authorize
      if (
        error.message &&
        (error.message.includes("500") ||
          error.message.includes("401") ||
          error.message.includes("invalid_request") ||
          error.message.includes("authorization code"))
      ) {
        // Clear authorization data
        sessionStorage.removeItem(STORAGE_KEYS.CODE);
        sessionStorage.removeItem(STORAGE_KEYS.VERIFIER);
        sessionStorage.removeItem(STORAGE_KEYS.AUTH_PROCESSED);
        sessionStorage.removeItem(STORAGE_KEYS.AUTH_PROCESSING);
      }

      throw error;
    }
  }, [setTwitterName]);

  return {
    reconnectTwitter: handleReconnectTwitter,
    fetchTwitterAccessToken,
  };
};
