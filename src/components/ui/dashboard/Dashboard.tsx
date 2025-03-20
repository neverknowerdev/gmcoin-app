import React, { useEffect, useState } from "react";
import styles from "./Dashboard.module.css";
import { UserInfo } from "./UserInfo/UserInfo";
// import EventList from "./EventList/EventList";
import { useWalletActions } from "@/src/hooks/useWalletActions";
import { useWeb3 } from "@/src/hooks/useWeb3";
// import ConfirmModal from "./ConfirmModal/ConfirmModal";
import { STORAGE_KEYS } from "@/src/constants/storage";

export const Dashboard = () => {
  const [twitterName, setTwitterName] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalState, setModalState] = useState<
    "loading" | "error" | "success" | "wrongNetwork" | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { connect, disconnect, getProvider, getSigner } = useWeb3();
  const { reconnectWallet } = useWalletActions({
    connect,
    setModalState,
    setErrorMessage,
    setUser: () => {},
  });

  useEffect(() => {
    const fetchStoredData = () => {
      // Get data from localStorage
      const storedTwitterName = localStorage.getItem(STORAGE_KEYS.TWITTER_NAME);
      const storedWalletAddress = localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);

      if (storedTwitterName) {
        setTwitterName(storedTwitterName);
      }

      if (storedWalletAddress) {
        setWalletAddress(storedWalletAddress);
      }
    };

    fetchStoredData();
  }, []);

  const handleDisconnect = () => {
    setShowConfirmModal(true);
  };

  const confirmDisconnect = async () => {
    setShowConfirmModal(false);
    await disconnect();
    
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEYS.TWITTER_NAME);
    localStorage.removeItem(STORAGE_KEYS.WALLET_ADDRESS);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_BALANCE);
    localStorage.removeItem(STORAGE_KEYS.TWITTER_USER_ID);
    localStorage.removeItem(STORAGE_KEYS.HAS_COMPLETED_VERIFICATION);
    localStorage.removeItem(STORAGE_KEYS.USER_AUTHENTICATED);
    
    // Clear sessionStorage
    sessionStorage.removeItem(STORAGE_KEYS.ENCRYPTED_ACCESS_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    // Redirect to connect page
    window.location.href = "/connect";
  };

  const cancelDisconnect = () => {
    setShowConfirmModal(false);
  };

  const handleReconnect = async () => {
    try {
      const newWalletAddress = await reconnectWallet(setWalletAddress);
      if (newWalletAddress) {
        setWalletAddress(newWalletAddress);
      }
    } catch (error) {
      console.error("Failed to reconnect wallet:", error);
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      {walletAddress && twitterName ? (
        <>
          <UserInfo
            twitterName={twitterName}
            walletAddress={walletAddress}
            onDisconnect={handleDisconnect}
            signer={getSigner()}
          />
        </>
      ) : (
        <div className={styles.reconnectContainer}>
          <p>Wallet disconnected</p>
          <button className={styles.reconnectButton} onClick={handleReconnect}>
            Reconnect Wallet
          </button>
        </div>
      )}
{/* 
      {showConfirmModal && (
        <ConfirmModal
          onConfirm={confirmDisconnect}
          onCancel={cancelDisconnect}
          title="Disconnect Wallet"
          message="Are you sure you want to disconnect your wallet? You will need to reconnect to access your account."
        />
      )} */}
    </div>
  );
}; 