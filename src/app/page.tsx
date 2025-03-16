"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "../hooks/useWallet";
import { useWeb3 } from "../hooks/useWeb3";
import { UserInfo } from "../components/ui/dashboard/UserInfo/UserInfo";
import { DashboardDecorations } from "../components/ui/dashboard/DashboardDecorations/DashboardDecorations";
import styles from "./dashboard.module.css";

const Dashboard = () => {
  const { disconnect: web3Disconnect, getSigner } = useWeb3();
  const { updateWalletInfo } = useWallet();
  const router = useRouter();

  const [walletAddress, setWalletAddress] = useState("");
  const [twitterName, setTwitterName] = useState("@username");

  useEffect(() => {
    const checkAuth = () => {
      const isAuthenticated =
        localStorage.getItem("userAuthenticated") === "true";
      const wallet = localStorage.getItem("walletAddress");
      const twitter = localStorage.getItem("twitterName") || "@username";

      if (!isAuthenticated || !wallet) {
        router.push("/connect");
        return;
      }

      updateWalletInfo(wallet);
      setWalletAddress(wallet);
      setTwitterName(twitter);
    };

    checkAuth();
  }, []);

  const handleDisconnect = async () => {
    try {
      await web3Disconnect();
      updateWalletInfo("");
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/connect";
    } catch (error) {
      console.error("Error disconnecting:", error);
    }
  };

  return (
    <div className={styles.container}>
      <UserInfo
        twitterName={twitterName}
        walletAddress={walletAddress}
        onDisconnect={handleDisconnect}
        signer={getSigner()}
      />
      <DashboardDecorations />
    </div>
  );
};

export default Dashboard;
