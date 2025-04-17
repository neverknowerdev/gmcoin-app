import { useState, useEffect, useCallback } from "react";
import { ethers, Contract } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/src/config";

export const useTokenBalance = (walletAddress: string | null, signer: any) => {
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadBalance = useCallback(async () => {
    if (!walletAddress || !signer) return;

    setIsLoading(true);
    try {
      let provider;
      
      try {
        if (signer.provider) {
          provider = signer.provider;
        } else if (signer.then) {
          const resolvedSigner = await signer;
          if (resolvedSigner && resolvedSigner.provider) {
            provider = resolvedSigner.provider;
          } else {
            if (typeof window !== 'undefined' && window.ethereum) {
              provider = new ethers.providers.Web3Provider(window.ethereum as any);
            } else {
              throw new Error("Ethereum provider not found");
            }
          }
        } else if (signer.getCode) {
          provider = signer;
        } else {
          if (typeof window !== 'undefined' && window.ethereum) {
            provider = new ethers.providers.Web3Provider(window.ethereum as any);
          } else {
            throw new Error("Ethereum provider not found in window");
          }
        }
      } catch (e) {
        console.error("Error getting provider:", e);
        return;
      }

      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      // console.log("Requesting balance for address:", walletAddress);
      // console.log("Using contract:", CONTRACT_ADDRESS);
      
      const rawBalance = await contract.balanceOf(walletAddress);
      // console.log("Received balance (raw):", rawBalance.toString());
      
      const decimals = await contract.decimals().catch(() => 18);
      // console.log("Decimals:", decimals);
      
      const formattedBalance = ethers.utils.formatUnits(rawBalance, decimals);
      // console.log("Formatted balance:", formattedBalance);

      setBalance(formattedBalance);
      localStorage.setItem("tokenBalance", formattedBalance);
    } catch (error) {
      console.error("Error loading balance:", error);
      const storedBalance = localStorage.getItem("tokenBalance");
      setBalance(storedBalance || "0.00");
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, signer]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  return { balance, isLoading, refreshBalance: loadBalance };
};
