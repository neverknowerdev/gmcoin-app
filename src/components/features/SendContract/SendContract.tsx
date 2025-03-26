import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./SendContract.module.css";
import ButtonBackground from "../../ui/buttons/BlueButton";
import Modal from "../../modals/Modal";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useWeb3 } from "@/src/hooks/useWeb3";
import { useWalletActions } from "@/src/hooks/useWalletActions";
import { useTwitterActions } from "@/src/hooks/useTwitterActions";
import { getErrorMessage } from "@/src/hooks/errorHandler";
import { useConnectWallet } from "@web3-onboard/react";
import { CURRENT_CHAIN } from "@/src/config";

interface SendContractProps {
  connectedWallet: { 
    accounts: { address: string }[],
    label?: string  
  } | null;
  sendTransaction: () => Promise<void>;
  walletAddress: string;
  connect: () => Promise<void>;
  isFirstTimeUser?: boolean;
  transactionStatus?: "idle" | "pending" | "sending" | "success" | "error";
}

const SendContract: React.FC<SendContractProps> = ({
  connectedWallet,
  walletAddress,
  sendTransaction,
  connect,
  isFirstTimeUser = true, // Default to true if not specified
  transactionStatus,
}) => {
  const [wallet, setWallet] = useState(walletAddress);
  const [walletAdd, setWalletAdd] = useState(walletAddress);
  const { getProvider, getSigner } = useWeb3();
  const [showTooltip, setShowTooltip] = useState(false);
  const [modalState, setModalState] = useState<
    "loading" | "error" | "success" | "wrongNetwork" | "sending" | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [user, setUser] = useState<string | null>(null);
  const [twitterName, setTwitterName] = useState<string | null>(
    localStorage.getItem("twitterName") || null
  );
  const [verifier, setVerifier] = useState(
    () => sessionStorage.getItem("verifier") || ""
  );
  const [code, setCode] = useState(() => sessionStorage.getItem("code") || "");
  const [isTwitterLoading, setIsTwitterLoading] = useState(false);
  const [twitterError, setTwitterError] = useState<string | null>(null);
  const router = useRouter();

  // Add flag to track completed authorization requests
  const [authAttempted, setAuthAttempted] = useState(false);
  


  // Check if user is a returning verified user
  useEffect(() => {
    const twitterUserId = localStorage.getItem("twitterUserId");
    const encryptedAccessToken = sessionStorage.getItem("encryptedAccessToken");
    const storedTwitterName = localStorage.getItem("twitterName");
    const hasCompletedTx = localStorage.getItem(
      "hasCompletedTwitterVerification"
    );
    

    // Only auto-show success modal for returning users who have completed verification
    if (
      twitterUserId &&
      encryptedAccessToken &&
      storedTwitterName &&
      hasCompletedTx === "true" &&
      !isFirstTimeUser
    ) {
      console.log(
        "Returning verified user, showing dashboard popup immediately"
      );
      setModalState("success");
    }
  }, [isFirstTimeUser, walletAddress]);

  const {
    switchNetwork,
    reconnectWallet,
    fetchTwitterAccessToken,
    checkNetwork,
    setupNetworkMonitoring,
  } = useWalletActions({
    connect,
    setModalState,
    setErrorMessage,
    setTwitterName,
    setVerifier,
    setIsWrongNetwork,
    setUser,
  });

  const { handleReconnectTwitter } = useTwitterActions({
    setModalState,
    setErrorMessage,
    setUser,
  });

  const handleReconnectWalletClick = () => reconnectWallet(setWalletAdd);
  const handleReconnectTwitterClick = () => handleReconnectTwitter();

  // Network change monitoring
  useEffect(() => {
    // Set up network change listener
    const cleanup = setupNetworkMonitoring();

    // Check network when component mounts
    checkNetwork();

    return cleanup;
  }, [setupNetworkMonitoring, checkNetwork]);

  // Check network before sending transaction
  const ensureCorrectNetwork = async () => {
    // Check current network
    const isCorrectNetwork = await checkNetwork();

    if (!isCorrectNetwork) {
      console.log("Wrong network, attempting to switch...");
      // Show error message, but try to switch network immediately
      setModalState("wrongNetwork");
      setErrorMessage(`Please switch to network ${CURRENT_CHAIN.label} (${CURRENT_CHAIN.id})`);
      
      // If we have an Ambire wallet, add instructions for manual network switch
      if (connectedWallet?.label === 'Ambire') {
        setErrorMessage(`For Ambire wallet: please switch to network ${CURRENT_CHAIN.label} manually in wallet settings.`);
      }
      
      return false;
    }

    return true;
  };

  useEffect(() => {
    if (walletAddress) {
      setWallet(walletAddress);
      // Save address to localStorage when it changes
      localStorage.setItem("walletAddress", walletAddress);
      localStorage.setItem("userAuthenticated", "true");
    }
  }, [walletAddress]);

  useEffect(() => {
    const storedVerifier = sessionStorage.getItem("verifier");
    const storedCode = sessionStorage.getItem("code");
    const storedUsername = localStorage.getItem("twitterName");
    if (storedVerifier && storedCode) {
      setVerifier(storedVerifier);
      setCode(storedCode);
      setTwitterName(storedUsername);
    }
  }, []);

  useEffect(() => {
    const updateWallet = (event?: StorageEvent) => {
      if (!event || event.key === "walletAddress") {
        const storedWallet = localStorage.getItem("walletAddress");
        if (storedWallet) {
          setWalletAdd(storedWallet);
          setWallet(storedWallet);
        }
      }
    };
    window.addEventListener("storage", updateWallet);
    updateWallet(); // Initial check
    return () => {
      window.removeEventListener("storage", updateWallet);
    };
  }, []);

  useEffect(() => {
    if (verifier) {
      sessionStorage.setItem("verifier", verifier);
    }
  }, [verifier]);

  const isFormValid = walletAdd?.trim() !== "";

  const formatAddress = (address: string) => {
    if (!address || address === "Please connect wallet")
      return "Please connect wallet";
    return `${address.slice(0, 8)}...${address.slice(-4)}`;
  };

  const formatTwitter = (twitterName: string | null) => {
    if (!twitterName) return "..";

    if (twitterName.length > 18) {
      return `${twitterName.slice(0, 16)}...`;
    }

    return twitterName;
  };

  // Check if there's an authorization code in URL
  useEffect(() => {
    const checkUrlForAuthCode = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const authCode = urlParams.get("code");
      const state = urlParams.get("state");

      if (authCode && state) {
        console.log("Authorization code found in URL, saving...");

        // Save code to sessionStorage and add to processed codes list
        sessionStorage.setItem("code", authCode);

        // Initialize processed codes array if it doesn't exist
        const processedCodes = JSON.parse(
          sessionStorage.getItem("processed_auth_codes") || "[]"
        );

        // Add current code to processed list if it's not already there
        if (!processedCodes.includes(authCode)) {
          processedCodes.push(authCode);
          sessionStorage.setItem(
            "processed_auth_codes",
            JSON.stringify(processedCodes)
          );
        }

        // Check state match
        const savedState = sessionStorage.getItem("oauth_state");
        if (savedState && savedState === state) {
          console.log("State matches, continuing authorization");
        } else {
          console.warn("State mismatch, possible CSRF attack");
          // Clear authorization data if state doesn't match
          sessionStorage.removeItem("code");
          sessionStorage.removeItem("verifier");
          return;
        }

        // Clear authorization parameters from URL
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);

        // Reload code and verifier
        setCode(authCode);
        const storedVerifier = sessionStorage.getItem("verifier");
        if (storedVerifier) {
          setVerifier(storedVerifier);
        } else {
          console.warn("Verifier not found in sessionStorage");
        }
      }
    };

    // Only check URL once when component mounts
    checkUrlForAuthCode();
  }, []);

  // Handle Twitter token retrieval
  useEffect(() => {
    // Skip token fetch if we already have a Twitter username or missing credentials
    const twitterNameExists = !!twitterName;
    const accessTokenExists = !!sessionStorage.getItem("accessToken");
    const authProcessed = sessionStorage.getItem("auth_processed") === "true";
    const authProcessing = sessionStorage.getItem("auth_processing") === "true";

    // Skip request if:
    // 1. We already have Twitter username or access token
    // 2. Missing code or verifier
    // 3. Authorization was already processed in this session
    // 4. Authorization is in progress
    // 5. Authorization attempt was already made in this component
    if (
      twitterNameExists ||
      accessTokenExists ||
      !code ||
      !verifier ||
      authProcessed ||
      authProcessing ||
      authAttempted
    ) {
      if (
        code &&
        verifier &&
        !authProcessed &&
        !authProcessing &&
        !authAttempted
      ) {
        console.log("Conditions for token request met, proceeding...");
      } else {
        console.log("Skipping Twitter token request:", {
          twitterNameExists,
          accessTokenExists,
          hasCode: !!code,
          hasVerifier: !!verifier,
          authProcessed,
          authProcessing,
          authAttempted,
        });
        return;
      }
    }

    console.log("Starting Twitter token fetch with fresh code...");
    console.log(
      "Code:",
      code.substring(0, 5) + "..." + code.substring(code.length - 5)
    );
    console.log(
      "Verifier:",
      verifier.substring(0, 5) + "..." + verifier.substring(verifier.length - 5)
    );

    // Set flag that authorization attempt was made
    setAuthAttempted(true);
    // Mark that authorization is being processed
    sessionStorage.setItem("auth_processing", "true");

    setIsTwitterLoading(true);
    setTwitterError(null);

    // Add small delay before token request
    setTimeout(() => {
      fetchTwitterAccessToken(code, verifier)
        .then((username) => {
          // Clear code and verifier only after successful processing
          console.log("Twitter auth successful, username:", username);
          setCode("");
          setVerifier("");
          sessionStorage.removeItem("verifier");
          sessionStorage.removeItem("code");
          sessionStorage.removeItem("redirect_uri");
          sessionStorage.removeItem("oauth_state");

          // Mark authorization as successfully processed
          sessionStorage.setItem("auth_processed", "true");
          sessionStorage.removeItem("auth_processing");

          // Update username in component
          setTwitterName(username);

          // Don't automatically show success for first-time users
          // They need to complete the transaction first
        })
        .catch((error) => {
          // Format error message for user
          let userErrorMessage = "Error getting Twitter token";

          if (error.message) {
            if (
              error.message.includes("invalid_request") ||
              error.message.includes("authorization code")
            ) {
              userErrorMessage =
                "Twitter authorization code is invalid or expired. Please try again.";
            } else if (error.message.includes("500")) {
              userErrorMessage =
                "Server error during Twitter authorization. Please try again later.";
            } else if (error.message.includes("401")) {
              userErrorMessage =
                "Twitter authorization error. Please try again.";
            }
          }

          setTwitterError(userErrorMessage);

          // If we got an invalid code error, we should also clear the code
          // to prevent repeated failed attempts
          if (
            error.message &&
            (error.message.includes("500") ||
              error.message.includes("401") ||
              error.message.includes("invalid_request") ||
              error.message.includes("authorization code"))
          ) {
            console.log("Clearing invalid Twitter auth code");
            setCode("");
            setVerifier("");
            sessionStorage.removeItem("verifier");
            sessionStorage.removeItem("code");
            sessionStorage.removeItem("redirect_uri");
            sessionStorage.removeItem("oauth_state");
            sessionStorage.removeItem("auth_processed");
            sessionStorage.removeItem("auth_processing");
          }
        })
        .finally(() => {
          setIsTwitterLoading(false);
        });
    }, 500); // 500ms delay for stability
  }, [code, verifier, fetchTwitterAccessToken, twitterName, authAttempted]);

  // Clean up processing flag when component unmounts
  useEffect(() => {
    return () => {
      // If authorization process wasn't completed, clear the flag
      if (
        sessionStorage.getItem("auth_processing") === "true" &&
        sessionStorage.getItem("auth_processed") !== "true"
      ) {
        sessionStorage.removeItem("auth_processing");
      }
    };
  }, []);

  // Save wallet address when it changes
  useEffect(() => {
    if (connectedWallet?.accounts[0]?.address) {
      const currentAddress = connectedWallet.accounts[0].address;
      console.log("Saving wallet address to localStorage:", currentAddress);
      localStorage.setItem("walletAddress", currentAddress);
      localStorage.setItem("userAuthenticated", "true");
    }
  }, [connectedWallet]);

  // React to transaction status changes
  useEffect(() => {
    if (transactionStatus === "sending") {
      setModalState("sending");
    } else if (transactionStatus === "success") {
      setModalState("success");
    } else if (transactionStatus === "error") {
      setModalState("error");
    } else if (transactionStatus === "pending") {
      setModalState("loading");
    }
  }, [transactionStatus]);
  // Error handling for transaction
  const handleTransactionError = (error: any) => {
    let errorMsg = getErrorMessage(error);
    
    // Check for user cancellation
    if (
      error.code === 4001 ||
      error.message?.includes("user rejected") ||
      error.message?.includes("User denied") ||
      error.message?.includes("User rejected") ||
      error.message?.includes("cancelled") ||
      error.message?.includes("window closed") ||
      error.message?.includes("user closed") ||
      error.message?.includes("Transaction cancelled by user") ||
      error.message?.includes("timed out") ||
      error.message?.includes("timeout")
    ) {
      errorMsg = "User rejected action";
      setErrorMessage(errorMsg);
      setModalState("error");
      console.error("💥 Transaction rejected by user:", errorMsg);
      return;
    }
    
    // Check for "wallet already linked" error
    if (error.message?.includes("wallet already linked for that user")) {
      console.log("✅ Wallet already linked for this user, redirecting to dashboard");
      // Save completed verification information
      localStorage.setItem("hasCompletedTwitterVerification", "true");
      localStorage.setItem("userAuthenticated", "true");
      // Redirect to dashboard
      router.push("/");
      return;
    }
    
    // Display error
    setErrorMessage(errorMsg);
    setModalState("error");
    console.error("💥 Transaction error:", errorMsg);
  };

  const handleSendTransaction = async () => {
    try {
      // Check if transaction is already in progress
      if (transactionStatus === "pending" || transactionStatus === "sending") {
        console.log("⚠️ Transaction already in progress, skipping");
        return;
      }
      
      setModalState("loading");

      // Check network before sending transaction
      const networkCorrect = await ensureCorrectNetwork();
      if (!networkCorrect) return;

      // Additional check for Ambire wallet
      if (connectedWallet?.label === 'Ambire') {
        console.log("Using Ambire wallet, using API relay to bypass limitations");
        
        // Force use of API relay for Ambire due to wallet limitations
        try {
          const provider = getProvider();
          
          if (!provider) {
            throw new Error("Failed to get provider");
          }
          
          // Always use getSigner for Ambire to ensure we have the most recent provider state
          const signer = await provider.getSigner().catch(error => {
            console.error("Error getting signer:", error);
            throw new Error("Failed to get signer from provider");
          });
          
          if (!signer) {
            throw new Error("Failed to get signer");
          }
          
          const address = await signer.getAddress().catch(error => {
            console.error("Error getting address:", error);
            throw new Error("Failed to get address from signer");
          });
          
          const accessToken = sessionStorage.getItem("accessToken");
          
          // Add delay before opening signature window
          setTimeout(async () => {
            try {
              // Show user waiting for signature indicator
              setModalState("loading");
              
              // Call function that handles the API call
              await sendTransaction();
            } catch (delayedError) {
              console.error("Error after delay:", delayedError);
              handleTransactionError(delayedError);
            }
          }, 1000); // Increase timeout to 1000ms for better stability
          
          return; // End execution of the main function
        } catch (setupError) {
          console.error("Error setting up transaction for Ambire:", setupError);
          handleTransactionError(setupError);
          return;
        }
      }

      // Add a timeout to detect if the transaction is taking too long
      // This helps catch cases when a user closes the wallet window without rejecting
      let transactionComplete = false;

      // Create promise race between transaction and timeout
      await Promise.race([
        // Regular transaction
        (async () => {
          try {
            await sendTransaction();
            transactionComplete = true;

            // Save verification status only after successful transaction
            localStorage.setItem("hasCompletedTwitterVerification", "true");
            // Modal state is now handled by the useEffect monitoring transactionStatus
          } catch (txError) {
            // Pass any errors up to the outer catch block
            throw txError;
          }
        })(),

        // Timeout to detect closed window (2 minutes should be enough for user to decide)
        new Promise((_, reject) => {
          setTimeout(() => {
            if (!transactionComplete) {
              reject(
                new Error(
                  "Transaction timed out - signature window may have been closed"
                )
              );
            }
          }, 120000);
        }),
      ]);
    } catch (error: any) {
      // Process error using new method
      handleTransactionError(error);
    }
  };

  return (
    <div className={styles.container}>
      {isTwitterLoading && (
        <div className={styles.overlayContainer}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingText}>
              <span>L</span>
              <span>O</span>
              <span>A</span>
              <span>D</span>
              <span>I</span>
              <span>N</span>
              <span>G</span>
            </div>
          </div>
        </div>
      )}
      <div className={styles.rainbow}>
        <img src="/image/contract/rainbow.webp" alt="Rainbow" />
      </div>
      <div className={styles.balloon}>
        <img src="/image/contract/ballon.webp" alt="Hot Air Balloon" />
      </div>
      <p className={styles.title}>SEND TRANSACTION</p>
      <div className={styles.form}>
        <label className={styles.label}>WALLET ADDRESS</label>
        <div className={styles.inputGroup}>
          <input
            type="text"
            placeholder="Enter Wallet..."
            value={formatAddress(walletAdd!)}
            onChange={(e) => setWallet(e.target.value)}
            className={styles.input}
            readOnly={!!connectedWallet}
          />
          <button
            className={styles.reconnectButton}
            onClick={handleReconnectWalletClick}
          >
            <RefreshCw size={20} className={styles.reconnectIcon} /> reconnect
          </button>
        </div>
        <label className={styles.label}>TWITTER USERNAME</label>
        <div className={styles.inputGroup}>
          <input
            type="text"
            placeholder="Enter Twitter..."
            value={isTwitterLoading ? "Loading..." : formatTwitter(twitterName)}
            className={styles.input}
            readOnly={true}
          />
          <button
            className={styles.reconnectButton}
            onClick={handleReconnectTwitterClick}
            disabled={isTwitterLoading}
          >
            <RefreshCw size={20} className={styles.reconnectIcon} /> reconnect
          </button>
        </div>

        <div className={styles.buttonContainer}>
          <div
            className={styles.buttonWrapper}
            onMouseEnter={() => !isFormValid && setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <button
              className={styles.createButton}
              onClick={handleSendTransaction}
              disabled={!isFormValid}
            >
              <ButtonBackground />
              <span className={styles.buttonText}>SEND</span>
            </button>
            {showTooltip && !isFormValid && (
              <div className={`${styles.tooltip} ${styles.tooltipVisible}`}>
                <span className={styles.tooltipIcon}>
                  <AlertCircle size={16} />
                </span>
                <span className={styles.tooltipText}>
                  Please fill in all fields
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {modalState && (
        <Modal onClose={() => setModalState(null)}>
          {modalState === "loading" && (
            <div className={styles.modalContent}>
              <div className={styles.loadingContainer}>
                <div className={styles.loadingText}>
                  <span>W</span>
                  <span>A</span>
                  <span>T</span>
                  <span>I</span>
                  <span>N</span>
                  <span>G</span>
                </div>
                <div className={styles.loadingText}>
                  <span>F</span>
                  <span>O</span>
                  <span>R</span>
                </div>
                <div className={styles.loadingText}>
                  <span>C</span>
                  <span>O</span>
                  <span>N</span>
                  <span>F</span>
                  <span>I</span>
                  <span>R</span>
                  <span>M</span>
                  <span>A</span>
                  <span>T</span>
                  <span>I</span>
                  <span>O</span>
                  <span>N</span>
                </div>
              </div>
            </div>
          )}
          
          {modalState === "sending" && (
            <div className={styles.modalContent}>
              <div className={styles.loadingContainer}>
                <div className={styles.loadingText}>
                  <span>S</span>
                  <span>E</span>
                  <span>N</span>
                  <span>D</span>
                  <span>I</span>
                  <span>N</span>
                  <span>G</span>
                </div>
                <div className={styles.loadingText}>
                  <span>T</span>
                  <span>R</span>
                  <span>A</span>
                  <span>N</span>
                  <span>S</span>
                  <span>A</span>
                  <span>C</span>
                  <span>T</span>
                  <span>I</span>
                  <span>O</span>
                  <span>N</span>
                </div>
              </div>
            </div>
          )}

          {modalState === "wrongNetwork" && (
            <div className={styles.modalContent}>
              <p>{errorMessage}</p>
              <div className={styles.switchNetworkButton}>
                <button
                  className={styles.successButton}
                  onClick={switchNetwork}
                >
                  <span className={styles.buttonText}>SWITCH NETWORK</span>
                </button>
              </div>
            </div>
          )}

          {modalState === "error" && (
            <div className={styles.modalContent}>
              <div className={styles.errorContainer}>
                <img
                  src="/sad-sun.png"
                  alt="Error"
                  className={styles.sadEmoji}
                />
                <h3 className={styles.errorTitle}>
                  {errorMessage === "User rejected action"
                    ? "Transaction Rejected"
                    : "Transaction Failed"}
                </h3>
                <p className={styles.errorMessage}>
                  {errorMessage === "User rejected action"
                    ? "You rejected the transaction. Would you like to try again?"
                    : errorMessage || "An error occurred during the transaction. Please try again."}
                </p>
              </div>
              <button
                className={styles.tryButton}
                onClick={() => {
                  setModalState(null);
                  setErrorMessage(null);
                }}
              >
                Try Again
              </button>
            </div>
          )}

          {modalState === "success" && (
            <div className={styles.modalContent}>
              <p>
                🎉 Well done!
                <br /> Now you're in. You can go to Twitter and write "GM".
                You'll receive GM coins for every tweet with "GM" word.
                <br /> Use hashtags and cashtags to get even more coins.
              </p>
              <img src="/sun.png" alt="Sun" className={styles.goodEmoji} />
              <a
                className={styles.twittButton}
                href={encodeURI(
                  'https://x.com/intent/tweet?text=Now I can get $GM for every "gm" tweet - awesome 🌀&via=gmcoin_meme'
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  className={styles.icon}
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
                </svg>
                Tweet GM
              </a>
              <a
                className={styles.twittButton}
                href="https://x.com/gmcoin_meme"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  className={styles.icon}
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13h-1v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
                </svg>
                Follow @TwitterGM
              </a>

              <button
                className={styles.successButton}
                onClick={() => {
                  // Make sure all data is saved before navigation
                  if (connectedWallet?.accounts[0]?.address) {
                    localStorage.setItem(
                      "walletAddress",
                      connectedWallet.accounts[0].address
                    );
                  }

                  // Set authentication flag
                  localStorage.setItem("userAuthenticated", "true");

                  // Save information that user has completed verification
                  localStorage.setItem(
                    "hasCompletedTwitterVerification",
                    "true"
                  );

                  // Redirect to dashboard
                  router.push("/");
                }}
              >
                GO TO DASHBOARD 🚀
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default SendContract;
