/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
// import init from '@web3-onboard/core';
import { init, useSetChain, useWallets } from "@web3-onboard/react";

import injectedModule from '@web3-onboard/injected-wallets';
import metamaskSDK from '@web3-onboard/metamask';
import phantomModule from '@web3-onboard/phantom';
import { AmbireWalletModule } from '@ambire/login-sdk-web3-onboard';
import { AmbireLoginSDK } from '@ambire/login-sdk-core'
import { CHAINS } from '@/src/config';
import { ethers } from 'ethers';
import {Chain, OnboardAPI, WalletState} from "@web3-onboard/core";


export const useWeb3 = () => {
  const [web3Onboard, setWeb3Onboard] = useState<OnboardAPI|null>(null);
  const [connectedWallet, setConnectedWallet] = useState<WalletState | null>(null);
  const [connectedChain, setConnectedChain] = useState<Chain | null>(null);

  useEffect(() => {
    if (!web3Onboard) return;

    const walletsSub = web3Onboard.state.select('wallets').subscribe((wallets:any) => {
      console.log('walletsSub', wallets.length, wallets);
      if (wallets && wallets.length > 0) {
        setConnectedWallet(wallets[0]);
        if (wallets[0].chains && wallets[0].chains.length > 0) {
          setConnectedChain(wallets[0].chains[0]);
        }
      } else {
        setConnectedWallet(null);
        setConnectedChain(null);
      }
    });

    return () => {
      walletsSub.unsubscribe();
    };
  }, [web3Onboard]);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ambireWallet = AmbireWalletModule({
      dappName: 'GM',
      dappIconPath: 'https://pbs.twimg.com/profile_images/1834344421984256000/AcWFYzUl_400x400.jpg',
    });

    const metamaskSDKWallet = metamaskSDK({
      options: {
        extensionOnly: false,
        dappMetadata: {
          name: 'GM',
        },
      },
    });

    const phantom = phantomModule();
    const injected = injectedModule();

    const onboard = init({
      wallets: [injected, ambireWallet, metamaskSDKWallet, phantom],
      connect: {
        showSidebar: true,
        autoConnectLastWallet: true,
      },
      chains: [
        {
          id: '0x14A34',  // Changed from '0x2105'
          token: 'ETH',
          label: 'Base Sepolia',  // Changed from 'Base'
          rpcUrl: 'https://sepolia.base.org',  // Changed from 'https://mainnet.base.org'
        }
      ],
      
      appMetadata: {
        name: 'GM',
        icon: 'https://pbs.twimg.com/profile_images/1834344421984256000/AcWFYzUl_400x400.jpg',
        description: 'GM ☀️ first tweet&mint coin',
        recommendedInjectedWallets: [
          { name: 'MetaMask', url: 'https://metamask.io' },
          { name: 'Coinbase', url: 'https://wallet.coinbase.com/' },
        ],
        gettingStartedGuide: 'getting started guide',
      },
      accountCenter: {
        desktop: {
          enabled: true,
        },
      },
    });

    setWeb3Onboard(onboard);
  }, []);
  const getProvider = () => {
    // const provider = new ethers.BrowserProvider(window.ethereum);
    // console.log('provider', provider);
    // return provider;
    if (!connectedWallet?.provider) {
      throw new Error('No wallet connected');
    }
    return new ethers.BrowserProvider(connectedWallet.provider, 84532);
  };

  const getSigner = async () => {
    const provider = getProvider();
    return await provider.getSigner();
  };
  const connect = async () => {
    if (!web3Onboard) return;

    try {
      const wallets = await web3Onboard.connectWallet();
      console.log('wallets', wallets.length, wallets);
      // await web3Onboard.setChain({chainId: '0x2105'});
      await switchToBase();
      // const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      // console.log('Connected account:', accounts.length, accounts);

      if(wallets.length > 0) {
        setConnectedWallet(wallets[0]);
        await web3Onboard.connectWallet();
        if (wallets[0].chains && wallets[0].chains.length > 0) {
          setConnectedChain(wallets[0].chains[0]);
        }

        web3Onboard.state.select('chains').subscribe((chains: Chain[]) => {
          console.log('chains sub', chains.length, chains);
          if (chains && chains.length > 0) {
            setConnectedChain(chains[0]);
          }
        });
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };
  const createAmbireWallet = async () => {
    try {
      const ambireLoginSDK = new AmbireLoginSDK({
        dappName: "GM",
        dappIconPath: 'https://pbs.twimg.com/profile_images/1834344421984256000/AcWFYzUl_400x400.jpg',
      });

      ambireLoginSDK.openLogin({chainId: 84532});  // Changed from 8453
      console.log("Ambire Wallet created successfully!");
    } catch (error) {
      console.error("Error creating Ambire Wallet:", error);
    }
  };
  const disconnect = async () => {
    if (!web3Onboard || !connectedWallet) return;
  
    try {
      if(connectedWallet) {
        await web3Onboard.disconnectWallet(connectedWallet);
        setConnectedWallet(null);
        setConnectedChain(null);
      }
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };
  return {
    disconnect,
    web3Onboard,
    connectedWallet,
    connectedChain,
    connect,
    createAmbireWallet,
    getProvider,
    getSigner
  };
};

async function switchToBase() {
  console.log('switchToBase..');
  const baseChainId = '0x14A34';  // Changed from '0x2105'

  const windowEthereum = window.ethereum;
  if(!windowEthereum) {
    return;
  }

  try {
    // Check the current chain ID
    const currentChainId = await windowEthereum.request({ method: 'eth_chainId' });
    console.log('currentChainId', currentChainId);

    if (currentChainId !== baseChainId) {
      // Attempt to switch to Base network
      await windowEthereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: baseChainId }],
      });
    }

    console.log('Connected to Base network');
  } catch (switchError: any) {
    // If Base isn’t added, add it first
    if (switchError.code && switchError.code === 4902) {
      try {
        await windowEthereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: baseChainId,
              chainName: 'Base Sepolia',  // Changed from 'Base Mainnet'
              nativeCurrency: {
                name: 'Base',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://sepolia.base.org'],  // Changed from 'https://mainnet.base.org'
              blockExplorerUrls: ['https://sepolia.basescan.org'], 
            },
          ],
        
        });

        // After adding, switch to Base
        await windowEthereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: baseChainId }],
        });

        console.log('Base network added and switched');
      } catch (addError) {
        console.error('Failed to add Base network:', addError);
      }
    } else {
      console.error('Failed to switch to Base network:', switchError);
    }
  }
}
