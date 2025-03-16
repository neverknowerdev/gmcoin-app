"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "../hooks/useWallet";
import { useWeb3 } from "../hooks/useWeb3";
import { UserInfo } from "../components/dashboard/UserInfo/UserInfo";
import { DashboardDecorations } from "../components/dashboard/DashboardDecorations/DashboardDecorations";
import styles from "./dashboard.module.css";

const Dashboard = () => {
  const { disconnect: web3Disconnect, getSigner } = useWeb3();
  const { updateWalletInfo } = useWallet();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const isAuthenticated =
        localStorage.getItem("userAuthenticated") === "true";
      const walletAddress = localStorage.getItem("walletAddress");

      if (!isAuthenticated || !walletAddress) {
        router.push("/connect");
        return;
      }

      updateWalletInfo(walletAddress);
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
        twitterName={localStorage.getItem("twitterName") || "@username"}
        walletAddress={localStorage.getItem("walletAddress") || ""}
        onDisconnect={handleDisconnect}
        signer={getSigner()}
      />
      <DashboardDecorations />
    </div>
  );
};

export default Dashboard;
