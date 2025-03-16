import { useState, useEffect } from "react";
import { TwitterAuthState } from "@/types/twitter.types";
import { generateCodeVerifier, generateCodeChallenge } from "@/utils/auth";
import { TWITTER_CLIENT_ID } from "@/constants/api";

export const useTwitterAuth = () => {
  const [state, setState] = useState<TwitterAuthState>({
    isAuthorized: false,
    isConnected: false,
    isLoading: true,
    twitterName: "",
    userId: null,
  });

  const checkStoredAuth = () => {
    const twitterUserId = localStorage.getItem("twitterUserId");
    const encryptedAccessToken = sessionStorage.getItem("encryptedAccessToken");
    const twitterName = localStorage.getItem("twitterName");
    const hasCompletedTx = localStorage.getItem(
      "hasCompletedTwitterVerification"
    );

    if (twitterUserId && encryptedAccessToken && twitterName) {
      setState((prev) => ({
        ...prev,
        isConnected: true,
        isAuthorized: hasCompletedTx === "true",
        twitterName,
        userId: twitterUserId,
      }));
    }
  };

  const initiateAuth = async () => {
    const codeVerifier = generateCodeVerifier();
    sessionStorage.setItem("verifier", codeVerifier);

    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const redirectUri = encodeURIComponent(
      window.location.origin + window.location.pathname
    );

    const authUrl = `https://x.com/i/oauth2/authorize?response_type=code&client_id=${TWITTER_CLIENT_ID}&redirect_uri=${redirectUri}&scope=users.read%20tweet.read&state=state123&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    window.location.href = authUrl;
  };

  return {
    ...state,
    initiateAuth,
    checkStoredAuth,
  };
};
