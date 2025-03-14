import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./SendContract.module.css";
import ButtonBackground from "../buttons/BlueButton";
import Modal from "../modal/Modal";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useWeb3 } from "@/src/hooks/useWeb3";
import { useWalletActions } from "@/src/hooks/useWalletActions";
import { getErrorMessage } from "@/src/hooks/errorHandler";
import { useConnectWallet } from "@web3-onboard/react";

interface SendContractProps {
  connectedWallet: { accounts: { address: string }[] } | null;
  transactionStatus?: string; // Add this prop
  sendTransaction: () => Promise<void>;
  walletAddress: string;
  connect: () => Promise<void>;
  isFirstTimeUser?: boolean;
}

const SendContract: React.FC<SendContractProps> = ({
  connectedWallet,
  walletAddress,
  transactionStatus,
  sendTransaction,
  connect,
  isFirstTimeUser = true, // Default to true if not specified
}) => {
  const [wallet, setWallet] = useState(walletAddress);
  const [walletAdd, setWalletAdd] = useState(walletAddress);
  const { getProvider } = useWeb3();
  const [showTooltip, setShowTooltip] = useState(false);
  const [modalState, setModalState] = useState<
    "loading" | "error" | "success" | "wrongNetwork" | null
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
  const router = useRouter();
  
  // Check if user is a returning verified user
  
  const {
    switchNetwork,
    reconnectWallet,
    reconnectTwitter,
    fetchTwitterAccessToken,
  } = useWalletActions({
    connect,
    setModalState,
    setErrorMessage,
    setTwitterName,
    setVerifier,
    setIsWrongNetwork,
    setUser,
  });

  const handleReconnectWalletClick = () => reconnectWallet(setWalletAdd);
  const handleReconnectTwitterClick = () => reconnectTwitter();
  
  useEffect(() => {
    if (walletAddress) {
      setWallet(walletAddress);
    }
  }, [walletAddress]);
  
  //if we have hasCompletedTwitterVerification in localStorage then redirect to /
  useEffect(() => {
    const hasCompletedTwitterVerification = localStorage.getItem("hasCompletedTwitterVerification");
    if (hasCompletedTwitterVerification === "true") {
      router.push("/");
      // Alternative if using React Router:
      // navigate("/");
    }
  }, []);

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
    if (transactionStatus === "success") {
      // Only mark as verified after successful transaction
      localStorage.setItem("hasCompletedTwitterVerification", "true");
      
      // Show success modal after transaction completes
      setModalState("success");
    } else if (transactionStatus === "error") {
      // If parent component set error status, show error modal
      setModalState("error");
      setErrorMessage("Transaction failed");
    }
  }, [transactionStatus]);
  
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

  useEffect(() => {
    // Skip token fetch if we already have a Twitter username or missing credentials
    const twitterNameExists = !!twitterName;
    const accessTokenExists = !!sessionStorage.getItem('accessToken');

    if ((twitterNameExists || accessTokenExists) || !code || !verifier) {
      return;
    }

    console.log("Starting Twitter token fetch with fresh code...");
    setIsTwitterLoading(true);

    fetchTwitterAccessToken(code, verifier)
      .then(() => {
        // Clear code and verifier only after successful processing
        console.log("Twitter auth successful, clearing credentials");
        setCode('');
        setVerifier('');
        sessionStorage.removeItem('verifier');
        sessionStorage.removeItem('code');
        
        // Don't automatically show success for first-time users
        // They need to complete the transaction first
      })
      .catch(error => {
        console.error("Failed to fetch Twitter token:", error);

        // If we got an invalid code error, we should also clear the code
        // to prevent repeated failed attempts
        if (error.message && error.message.includes("500")) {
          console.log("Clearing invalid Twitter auth code");
          setCode('');
          setVerifier('');
          sessionStorage.removeItem('verifier');
          sessionStorage.removeItem('code');
        }
      })
      .finally(() => {
        setIsTwitterLoading(false);
      });
  }, [code, verifier, fetchTwitterAccessToken, twitterName]);

  const handleSendTransaction = async () => {
    if (!isFormValid) return;
  
    console.log('wallet', wallet);
    if (!connectedWallet) {
      console.log("Wallet not connected. Trying to connect...");
      await connect();
      return;
    }
    try {
      //@ts-ignore
      const provider = getProvider();
      const network = await provider.getNetwork();
  
      console.log('sendTransaction', provider, network);
  
      if (network.chainId.toString() !== "84532") {
        setIsWrongNetwork(true);
        setErrorMessage("Please switch to Base network");
        setModalState("wrongNetwork");
        return;
      }
  
      setModalState("loading");
      console.log("Starting transaction flow...");
  
      try {
        console.log("Calling sendTransaction()...");
        await sendTransaction();
        // Remove the transactionStatus check here - it will be handled by the useEffect
      }
      catch (error: any) {
        // Check if error is due to user rejection (MetaMask specific message)
        if (
          error.code === 4001 || // Standard rejection code
          error.code === "ACTION_REJECTED" ||
          (error.message && (
            error.message.toLowerCase().includes("user denied") || 
            error.message.toLowerCase().includes("user rejected") ||
            error.message.toLowerCase().includes("cancelled") ||
            error.message.toLowerCase().includes("canceled") ||
            error.message.toLowerCase().includes("rejected") ||
            error.message.toLowerCase().includes("rejection")
          ))
        ) {
          // User cancelled - show error, don't set as verified
          setErrorMessage("Transaction cancelled");
          setModalState("error");
          return;
        }
        
        // For other errors, let them propagate to the catch block below
        throw error;
      }
    } catch (error: any) {
      console.error("Transaction error:", error);
      const errorMessage = getErrorMessage(error);
      setErrorMessage(errorMessage);
      setModalState("error");
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
              <p>Transaction in progress...</p>
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
                  {errorMessage === "Transaction cancelled"
                    ? "Transaction Cancelled"
                    : "Transaction Failed"}
                </h3>
                <p className={styles.errorMessage}>
                  {errorMessage === "Transaction cancelled"
                    ? "You cancelled the transaction. Would you like to try again?"
                    : errorMessage}
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
                href="https://x.com/intent/tweet?text=Now%20I%20can%20get%20%24GM%20from%20%40GM%20-%20awesome!%20%F0%9F%8C%80"
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
                onClick={() => router.push("/")}
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