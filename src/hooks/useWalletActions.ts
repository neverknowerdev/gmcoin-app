import { useCallback } from "react";
import { useWeb3 } from "@/src/hooks/useWeb3";
import { CURRENT_CHAIN, TOKEN_URL, TWITTER_CLIENT_ID } from "@/src/config";
import { generateCodeVerifier, generateCodeChallenge } from "@/src/utils/auth";

interface WalletActionsParams {
  connect: () => Promise<void>;
  setModalState: (
    state: "loading" | "error" | "success" | "wrongNetwork" | null
  ) => void;
  setErrorMessage: (message: string | null) => void;
  setTwitterName?: (name: string | null) => void;
  setVerifier?: (verifier: string) => void;
  setIsWrongNetwork?: (state: boolean) => void;
  setUser: (name: string | null) => void;
}

export const useWalletActions = ({
  connect,
  setModalState,
  setErrorMessage,
  setTwitterName,
  setUser,
  setIsWrongNetwork,
}: WalletActionsParams) => {
  const { disconnect, connectedChain, getProvider, web3Onboard } = useWeb3();

  const handleSwitchNetwork = useCallback(async () => {
    console.log("handleSwitchNetwork");

    try {
      // Use web3Onboard to switch network
      const success = await web3Onboard?.setChain({
        chainId: CURRENT_CHAIN.hexId,
      });

      if (success) {
        console.log(
          `✅ Successfully switched to network ${CURRENT_CHAIN.label} (${CURRENT_CHAIN.id})`
        );
        setIsWrongNetwork?.(false);
        setModalState(null);
        return true;
      } else {
        console.error(
          `❌ Failed to switch to network ${CURRENT_CHAIN.label}`
        );
        setErrorMessage(
          `Failed to switch to network ${CURRENT_CHAIN.label}. Please switch the network manually in your wallet.`
        );
        setModalState("error");
        return false;
      }
    } catch (switchError: any) {
      console.error("❌ Error while switching network:", switchError);
      setErrorMessage(
        `Error while switching network: ${
          switchError.message || "Unknown error"
        }`
      );
      setModalState("error");
      return false;
    }
  }, [web3Onboard, setIsWrongNetwork, setModalState, setErrorMessage]);

  // Function to check network correctness
  const checkNetwork = useCallback(async () => {
    if (!connectedChain) {
      console.log("❌ No connected network");
      return false;
    }

    const currentChainId = parseInt(connectedChain.id, 16);
    const targetChainId = CURRENT_CHAIN.id;

    console.log(
      `🔍 Network check: current ${currentChainId}, target ${targetChainId}`
    );

    if (currentChainId !== targetChainId) {
      console.log(
        `❌ Wrong network: ${currentChainId}, required ${targetChainId}`
      );
      setIsWrongNetwork?.(true);
      return false;
    }

    console.log(
      `✅ Correct network: ${CURRENT_CHAIN.label} (${targetChainId})`
    );
    setIsWrongNetwork?.(false);
    return true;
  }, [connectedChain, setIsWrongNetwork]);

  // Function to monitor network changes
  const setupNetworkMonitoring = useCallback(() => {
    if (typeof window === "undefined" || !window.ethereum) return () => {};

    const handleChainChanged = (chainId: string | unknown) => {
      if (typeof chainId !== "string") return;

      const newChainId = parseInt(chainId, 16);
      console.log(`🔄 Network changed to: ${newChainId}`);

      if (newChainId !== CURRENT_CHAIN.id) {
        console.log(
          `⚠️ Detected wrong network: ${newChainId}, required ${CURRENT_CHAIN.id}`
        );
        setIsWrongNetwork?.(true);
      } else {
        console.log(
          `✅ Network matches required: ${CURRENT_CHAIN.label} (${CURRENT_CHAIN.id})`
        );
        setIsWrongNetwork?.(false);
      }
    };

    
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      if (window.ethereum) {
        
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [setIsWrongNetwork]);

  const handleReconnectWallet = useCallback(
    async (setWalletAdd: any) => {
      try {
        await disconnect();
        await connect();
        const walletAddress = localStorage.getItem("walletAddress");
        setWalletAdd(walletAddress || "");
        setModalState(null);
        return walletAddress;
      } catch (error) {
        setErrorMessage("Failed to reconnect wallet");
        setModalState("error");
      }
    },
    [disconnect, connect, setModalState, setErrorMessage]
  );

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
      console.log(
        `Retrying in ${delay}ms, attempts remaining: ${retries}`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryWithDelay(fn, retries - 1, delay * 1.5);
    }
  };

  const handleFetchTwitterAccessToken = useCallback(
    async (code: string, verifier: string) => {
      const url = TOKEN_URL;
      if (!url) {
        console.error("❌ TOKEN_URL is not defined in .env!");
        throw new Error("Server configuration error: TOKEN_URL is not defined");
      }

      // Check if this code was already processed
      const processedCodes = JSON.parse(
        sessionStorage.getItem("processed_auth_codes") || "[]"
      );
      if (processedCodes.includes(code)) {
        // Return username from localStorage if it exists
        const cachedUsername = localStorage.getItem("twitterName");
        if (cachedUsername) {
          return cachedUsername;
        }
      }

      // Get saved redirect_uri - IMPORTANT use exactly the same URI that was used when requesting the code
      const redirectUri =
        sessionStorage.getItem("redirect_uri") ||
        window.location.origin + window.location.pathname;

      // Ensure redirect_uri doesn't contain extra parameters
      const cleanRedirectUri = redirectUri.split("?")[0];
      console.log(
        "Using redirect_uri for token request:",
        cleanRedirectUri
      );

      // Generate unique request ID for tracking
      const requestId = `${code.substring(0, 5)}_${Date.now()}`;
      console.log(`📝 Token request Twitter [${requestId}]`);

      console.log(
        "Sending token request to Twitter with parameters:"
      );
      console.log("- URL:", url);
      console.log(
        "- Code:",
        code.substring(0, 5) + "..." + code.substring(code.length - 5)
      );
      console.log(
        "- Verifier:",
        verifier.substring(0, 5) +
          "..." +
          verifier.substring(verifier.length - 5)
      );
      console.log("- Redirect URI:", cleanRedirectUri);
      console.log("- Request ID:", requestId);

      try {
        // Add code to the list of processed codes immediately to avoid duplicate requests
        if (!processedCodes.includes(code)) {
          processedCodes.push(code);
          sessionStorage.setItem(
            "processed_auth_codes",
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
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache, no-store",
              Pragma: "no-cache",
              "X-Request-ID": requestId,
            },
            body: JSON.stringify(requestBody),
          });

          console.log(`📥 Response from server [${requestId}]:`, response.status);

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
              errorText.includes(
                "Value passed for the authorization code was invalid"
              )
            ) {
              throw new Error(
                `Authorization code is invalid: ${response.status}, ${errorText}`
              );
            }

            throw new Error(
              `HTTP error! Status: ${response.status}, Text: ${errorText}`
            );
          }

          let responseData;
          try {
            responseData = await response.json();
          } catch (e) {
            console.error(`❌ Error parsing JSON [${requestId}]:`, e);
            throw new Error("Error parsing server response");
          }

          return responseData;
        }, 1);

        console.log(`✅ Data received from server [${requestId}]:`, {
          username: data.username,
          user_id: data.user_id,
          hasAccessToken: !!data.access_token,
          hasEncryptedToken: !!data.encrypted_access_token,
        });

        if (!data || !data.username) {
          console.error(
            `❌ Invalid response from server [${requestId}]:`,
            data
          );
          throw new Error("Invalid response from server");
        }

        // Save user data
        setTwitterName?.(data.username);
        localStorage.setItem("twitterName", data.username);
        localStorage.setItem("twitterUserId", data.user_id);
        localStorage.setItem("isTwitterConnected", "true");
        localStorage.setItem("userAuthenticated", "true");

        // Save tokens
        if (data.encrypted_access_token) {
          localStorage.setItem(
            "encryptedAccessToken",
            data.encrypted_access_token
          );
          sessionStorage.setItem(
            "encryptedAccessToken",
            data.encrypted_access_token
          );
        }

        if (data.access_token) {
          localStorage.setItem("accessToken", data.access_token);
          sessionStorage.setItem("accessToken", data.access_token);
        }

        // Mark that authorization is successfully completed
        sessionStorage.setItem("auth_processed", "true");
        sessionStorage.removeItem("auth_processing");

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
          sessionStorage.removeItem("code");
          sessionStorage.removeItem("verifier");
          sessionStorage.removeItem("auth_processed");
          sessionStorage.removeItem("auth_processing");
        }

        throw error;
      }
    },
    [setTwitterName]
  );

  return {
    switchNetwork: handleSwitchNetwork,
    reconnectWallet: handleReconnectWallet,
    reconnectTwitter: handleReconnectTwitter,
    fetchTwitterAccessToken: handleFetchTwitterAccessToken,
    checkNetwork,
    setupNetworkMonitoring,
  };
};
