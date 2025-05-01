import { useState, useCallback } from 'react';
import { STORAGE_KEYS } from '@/src/constants/storage';

export const useWallet = () => {
  const [walletInfo, setWalletInfo] = useState<string>('');

  const updateWalletInfo = useCallback((address: string) => {
    setWalletInfo(address);
    localStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, address);
  }, []);

  const clearWalletInfo = useCallback(() => {
    setWalletInfo('');
    localStorage.removeItem(STORAGE_KEYS.WALLET_ADDRESS);
  }, []);

  return { 
    walletInfo, 
    updateWalletInfo,
    clearWalletInfo
  };
};
