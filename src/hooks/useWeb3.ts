import { useState, useEffect } from 'react';
import { init, useSetChain, useWallets } from "@web3-onboard/react";

import injectedModule from '@web3-onboard/injected-wallets';
import metamaskSDK from '@web3-onboard/metamask';
import phantomModule from '@web3-onboard/phantom';
import walletConnectModule from '@web3-onboard/walletconnect';
// Add Coinbase Wallet import
import coinbaseWalletModule from '@web3-onboard/coinbase';
import { AmbireWalletModule } from '@ambire/login-sdk-web3-onboard';
import { AmbireLoginSDK } from '@ambire/login-sdk-core'
import { CHAINS, WALLETCONNECT_PROJECT_ID } from '@/src/config';
import { ethers } from 'ethers';
import {Chain, OnboardAPI, WalletState} from "@web3-onboard/core";
import { CONTRACT_ADDRESS, CONTRACT_ABI, API_URL, CURRENT_CHAIN } from "@/src/config";


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

    // Initialize WalletConnect
    const walletConnect = walletConnectModule({
      projectId: WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
      requiredChains: [CURRENT_CHAIN.id],
      dappUrl: window.location.origin
    });

    // Initialize Coinbase Wallet with the correct properties
    const coinbaseWallet = coinbaseWalletModule({
      darkMode: false,
      enableMobileWalletLink: true,
      reloadOnDisconnect: false
    });

    const phantom = phantomModule();
    const injected = injectedModule();

    const onboard = init({
      // Add coinbaseWallet to the wallets array
      wallets: [injected, metamaskSDKWallet, phantom, walletConnect, coinbaseWallet],
      connect: {
        showSidebar: true,
        autoConnectLastWallet: true,
      },
      chains: [
        {
          id: CURRENT_CHAIN.hexId,
          token: CURRENT_CHAIN.token,
          label: CURRENT_CHAIN.label,
          rpcUrl: CURRENT_CHAIN.rpcUrl,
        }
      ],
      
      appMetadata: {
        name: 'GM',
        icon: 'https://i.ibb.co/8DgJBg1H/Ac-WFYz-Ul-400x400-5.jpg',
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
    if (!connectedWallet?.provider) {
      throw new Error('No wallet connected');
    }
    // return connectedWallet.provider;
    return new ethers.BrowserProvider(connectedWallet.provider, CURRENT_CHAIN.hexId);
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
      await switchToBase();

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

      ambireLoginSDK.openLogin({chainId: CURRENT_CHAIN.id});  // Changed from 8453
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
  const baseChainId = CURRENT_CHAIN.hexId;

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

    console.log(`Connected to ${CURRENT_CHAIN.label} network`);
  } catch (switchError: any) {
    // If Base isn't added, add it first
    if (switchError.code && switchError.code === 4902) {
      try {
        await windowEthereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: baseChainId,
              chainName: CURRENT_CHAIN.label,
              nativeCurrency: {
                name: 'Base',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: [CURRENT_CHAIN.rpcUrl],
              blockExplorerUrls: [CURRENT_CHAIN.blockExplorerUrl], 
            },
          ],
        });

        // After adding, switch to Base
        await windowEthereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: baseChainId }],
        });

        console.log(`${CURRENT_CHAIN.label} network added and switched`);
      } catch (addError) {
        console.error(`Failed to add ${CURRENT_CHAIN.label} network:`, addError);
      }
    } else {
      console.error(`Failed to switch to ${CURRENT_CHAIN.label} network:`, switchError);
    }
  }
}