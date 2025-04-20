import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CURRENT_CHAIN } from "@/src/config";
import { client } from "@/src/config/thirdweb";

// Type definitions
type WalletState = {
  label: string;
  accounts: { address: string }[];
  chains: { id: string }[];
  provider: any;
};

export const useWeb3 = () => {
  const [connectedWallet, setConnectedWallet] = useState<WalletState | null>(null);
  
  // Check for connected wallet in localStorage
  useEffect(() => {
    // Check if we're in browser
    if (typeof window === 'undefined') return;

    // Check if wallet is already connected via localStorage
    const checkConnectedWallet = () => {
      const walletAddress = localStorage.getItem("walletAddress");
      
      if (walletAddress) {
        // Create a basic wallet state object with the address
        const walletState: WalletState = {
          label: "Connected Wallet",
          accounts: [{ address: walletAddress }],
          chains: [{ id: CURRENT_CHAIN.hexId }],
          provider: new ethers.JsonRpcProvider(CURRENT_CHAIN.rpcUrl),
        };
        
        setConnectedWallet(walletState);
      }
    };
    
    checkConnectedWallet();
    
    // Listen for wallet changes from thirdweb
    window.addEventListener('wallet_connected', checkConnectedWallet);
    
    return () => {
      window.removeEventListener('wallet_connected', checkConnectedWallet);
    };
  }, []);

  // Connect wallet - forward to thirdweb's connect button
  const connect = async () => {
    try {
      // The actual connection is handled by thirdweb's ConnectButton
      // This is just a placeholder for API compatibility
      return true;
    } catch (error) {
      console.error("Error in connect function:", error);
      return false;
    }
  };

  // Create Ambire wallet - placeholder for compatibility
  const createAmbireWallet = async () => {
    try {
      // The actual connection is handled by thirdweb's ConnectButton
      return true;
    } catch (error) {
      console.error("Error in createAmbireWallet function:", error);
      return false;
    }
  };

  // Disconnect wallet
  const disconnect = async () => {
    try {
      // Clear local storage
      localStorage.removeItem("walletAddress");
      localStorage.removeItem("walletBalance");
      
      // Update state
      setConnectedWallet(null);
      
      return true;
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
      return false;
    }
  };

  // Get provider for interacting with the blockchain
  const getProvider = () => {
    if (!connectedWallet?.provider) {
      console.warn("No wallet connected");
      return null;
    }
    return connectedWallet.provider;
  };

  // Get signer for signing transactions
  const getSigner = async () => {
    try {
      const provider = getProvider();
      if (!provider) {
        console.error("No provider available");
        return null;
      }
      
      return provider.getSigner();
    } catch (error) {
      console.error("Error getting signer:", error);
      return null;
    }
  };

  return {
    connectedWallet,
    connect,
    createAmbireWallet,
    disconnect,
    getSigner,
    getProvider,
    switchToNetwork: async () => true, // Dummy function for compatibility
  };
};

// Helper function for switching to Base network
export async function switchToBase() {
  console.log("Using thirdweb for network switching");
  return true; // Thirdweb handles network switching automatically
}
