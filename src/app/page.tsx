"use client";
import React, { useEffect, useState } from "react";
import styles from "./dashboard.module.css";
import { useWallet } from "@/src/context/WalletContext";
import { useWeb3 } from "@/src/hooks/useWeb3";
import { useRouter } from "next/navigation";
import { ethers, Contract } from "ethers";
import { CONTRACT_ADDRESS } from "@/src/config";

const CONTRACT_ABI = [
  "function requestTwitterVerification(string calldata accessCodeEncrypted, string calldata userID) public",
  "event TwitterVerificationResult(string indexed userID, address indexed wallet, bool isSuccess, string errorMsg)",
  "function userByWallet(address wallet) public view returns (string memory)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

const Dashboard = () => {
  const { disconnect: web3Disconnect, getSigner } = useWeb3();
  const { updateWalletInfo } = useWallet();
  const router = useRouter();
  const [twitterName, setTwitterName] = useState<string>("");
  const [username, setUsername] = useState("@username");
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("verifier") || "";
    }
    return "";
  });

  const [code, setCode] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("code") || "";
    }
    return "";
  });
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    const storedAddress = localStorage.getItem("walletAddress");
    if (storedAddress) {
      setWalletAddress(storedAddress);
    }
  }, []);
  useEffect(() => {
    const storedUser = sessionStorage.getItem("verifier");
    const storedCode = sessionStorage.getItem("code");
    if (storedUser && storedCode) {
      setUser(storedUser);
      setCode(storedCode);
    }
  }, []);

  useEffect(() => {
    const storedUsername = localStorage.getItem("twitterName");
    if (storedUsername) {
      setTwitterName(
        storedUsername.startsWith("@") ? storedUsername : `@${storedUsername}`
      );
    }
  }, []);

 
  
  const loadTokenBalance = async () => {
    if (!walletAddress) {
      console.error("Wallet address not found");
      return;
    }
    setIsLoading(true);

    try {
      const signer = await getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const rawBalance = await contract.balanceOf(walletAddress);
      console.log("Raw balance:", rawBalance);

      let decimals = 18;
      if (typeof contract.decimals === "function") {
        decimals = await contract.decimals();
      } else {
        console.warn("Decimals method not supported, defaulting to 18");
      }

      const formattedBalance = ethers.formatUnits(rawBalance, decimals);
      setTokenBalance(formattedBalance);
    } catch (error) {
      setTokenBalance("0.00");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      loadTokenBalance();
    }
  }, [walletAddress]);

  const handleDisconnect = async () => {
    try {
      await web3Disconnect();
      updateWalletInfo("");
      const secondTime = localStorage.getItem("hasCompletedTwitterVerification");
      // Clear all local storage items
      localStorage.clear();
      // Clear all session storage items
      sessionStorage.clear();
      if (secondTime) {
        localStorage.setItem("hasCompletedTwitterVerification", secondTime);
      }
      // Redirect to the connect page
      router.push("/connect");
    } catch (error) {
      console.error("Error disconnecting:", error);
    }
  };

  const formatAddress = (address: string) => {
    if (!address || address === "Please connect wallet")
      return "Please connect wallet";
    return `${address.slice(0, 10)}...${address.slice(-4)}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.infoContainer}>
        <div className={styles.cosmoman}>
          <img src="/cosmoman.png" alt="Cosmoman" />
        </div>

        <div className={styles.cloude}>
          <p className={styles.username}>{twitterName || username}</p>
          <div className={styles.addressContainer}>
            <p>{formatAddress(walletAddress!)}</p>
            <button
              className={`${styles.iconButton} ${styles.disconnectButton}`}
              onClick={handleDisconnect}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 3H6a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h4" />
                <path d="M18 8l4 4-4 4" />
                <path d="M22 12H10" />
              </svg>
            </button>
          </div>
          <div className={styles.balanceContainer}>
            <p className={styles.balance}>
              {isLoading
                ? "Loading..."
                : tokenBalance
                ? `${tokenBalance} GM`
                : "0 GM"}
            </p>
            <button
              className={`${styles.iconButton} ${styles.refreshButton}`}
              onClick={loadTokenBalance}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.9 3.2L21 9" />
                <path d="M21 3v6h-6" />
                <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.9-3.2L3 15" />
                <path d="M3 21v-6h6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className={styles.decorations}>
        <div className={styles.rainbow}>
          <img src="/image/wallet/rainbow.png" alt="Rainbow" />
        </div>
        <div className={styles.cloud1}>
          <img src="/image/wallet/cloud1.png" alt="Cloud1" />
        </div>
        <div className={styles.cloud2}>
          <img src="/image/wallet/cloud2.png" alt="Cloud2" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
