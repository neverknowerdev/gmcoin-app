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
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const rawBalance = await contract.balanceOf(walletAddress);
      const decimals = await contract.decimals().catch(() => 18);
      const formattedBalance = ethers.formatUnits(rawBalance, decimals);

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
