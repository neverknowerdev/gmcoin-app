import { useCallback } from "react";
import { TWITTER_CLIENT_ID } from "@/src/config";
import { generateCodeChallenge } from "@/src/utils/auth";

interface TwitterActionsParams {
  setModalState: (
    state: "loading" | "error" | "success" | "wrongNetwork" | null
  ) => void;
  setErrorMessage: (message: string | null) => void;
  setUser: (name: string | null) => void;
}

export const useTwitterActions = ({
  setModalState,
  setErrorMessage,
  setUser,
}: TwitterActionsParams) => {
  
  const handleReconnectTwitter = useCallback(async () => {
    try {
      console.log("Starting Twitter authorization process...");

      // Clear all previous authorization data
      sessionStorage.removeItem("code");
      sessionStorage.removeItem("verifier");
      sessionStorage.removeItem("auth_processed");
      sessionStorage.removeItem("auth_processing");
      sessionStorage.removeItem("redirect_uri");
      sessionStorage.removeItem("oauth_state");

      // Generate new code_verifier using crypto API
      let codeVerifier = "";
      const array = new Uint8Array(64);
      window.crypto.getRandomValues(array);
      codeVerifier = Array.from(array, (byte) =>
        ("0" + (byte & 0xff).toString(16)).slice(-2)
      ).join("");

      // Ensure verifier length meets requirements (43-128 characters)
      if (codeVerifier.length > 128) {
        codeVerifier = codeVerifier.substring(0, 128);
      } else if (codeVerifier.length < 43) {
        // Pad to minimum length
        while (codeVerifier.length < 43) {
          codeVerifier += Math.random().toString(36).substring(2);
        }
        codeVerifier = codeVerifier.substring(0, 128);
      }

      console.log("Generated code_verifier with length:", codeVerifier.length);

      // Save verifier in sessionStorage
      sessionStorage.setItem("verifier", codeVerifier);

      // Generate code_challenge
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      console.log("Generated code_challenge");

      // Generate state for CSRF protection
      const state =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem("oauth_state", state);

      // Create redirect_uri based on current URL
      const redirectUri = window.location.origin + window.location.pathname;
      sessionStorage.setItem("redirect_uri", redirectUri);

      // Encode redirect_uri for URL
      const encodedRedirectUri = encodeURIComponent(redirectUri);

      // Form Twitter authorization URL
      const twitterAuthUrl = `https://x.com/i/oauth2/authorize?response_type=code&client_id=${TWITTER_CLIENT_ID}&redirect_uri=${encodedRedirectUri}&scope=users.read%20tweet.read&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

      console.log(
        "Redirecting to Twitter authorization URL:",
        twitterAuthUrl
      );

      // Redirect user to Twitter authorization page
      window.location.href = twitterAuthUrl;
    } catch (error) {
      console.error("Error while reconnecting Twitter:", error);
      setErrorMessage("Failed to reconnect Twitter");
      setModalState("error");
    }
  }, [setErrorMessage, setModalState, setUser]);

  return {
    handleReconnectTwitter
  };
}; 