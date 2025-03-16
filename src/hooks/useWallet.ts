import { useState } from 'react';

export const useWallet = () => {
  const [walletInfo, setWalletInfo] = useState('');

  const updateWalletInfo = (address: string) => {
    setWalletInfo(address);
    localStorage.setItem('walletAddress', address);
  };

  return { updateWalletInfo };
}; 