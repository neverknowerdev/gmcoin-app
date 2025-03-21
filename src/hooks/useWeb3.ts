import { useState, useEffect, useCallback } from "react";
import { init, useSetChain, useWallets } from "@web3-onboard/react";

import injectedModule from "@web3-onboard/injected-wallets";
import metamaskSDK from "@web3-onboard/metamask";
import phantomModule from "@web3-onboard/phantom";
import walletConnectModule from "@web3-onboard/walletconnect";
// Add Coinbase Wallet import
import coinbaseWalletModule from "@web3-onboard/coinbase";
import { AmbireWalletModule } from "@ambire/login-sdk-web3-onboard";
import { AmbireLoginSDK } from "@ambire/login-sdk-core";
import { CHAINS, WALLETCONNECT_PROJECT_ID } from "@/src/config";
import { ethers } from "ethers";
import { Chain, OnboardAPI, WalletState } from "@web3-onboard/core";
import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  API_URL,
  CURRENT_CHAIN,
} from "@/src/config";
import { showNetworkSwitchModal } from "@/src/utils/networkModal";

export const useWeb3 = () => {
  const [web3Onboard, setWeb3Onboard] = useState<OnboardAPI | null>(null);
  const [connectedWallet, setConnectedWallet] = useState<WalletState | null>(
    null
  );
  const [connectedChain, setConnectedChain] = useState<Chain | null>(null);

  useEffect(() => {
    if (!web3Onboard) return;

    const walletsSub = web3Onboard.state
      .select("wallets")
      .subscribe((wallets: any) => {
        console.log("walletsSub", wallets.length, wallets);
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
    if (typeof window === "undefined") return;

    const ambireWallet = AmbireWalletModule({
      dappName: "GM",
      dappIconPath:
        "https://pbs.twimg.com/profile_images/1834344421984256000/AcWFYzUl_400x400.jpg",
    });

    const metamaskSDKWallet = metamaskSDK({
      options: {
        extensionOnly: false,
        dappMetadata: {
          name: "GM",
        },
      },
    });

    // Initialize WalletConnect
    const walletConnect = walletConnectModule({
      projectId: WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
      requiredChains: [CURRENT_CHAIN.id],
      dappUrl: window.location.origin,
    });

    // Initialize Coinbase Wallet with the correct properties
    const coinbaseWallet = coinbaseWalletModule({
      darkMode: false,
      enableMobileWalletLink: true,
      reloadOnDisconnect: false,
    });

    const phantom = phantomModule();
    const injected = injectedModule();

    const onboard = init({
      // Add coinbaseWallet to the wallets array
      wallets: [
        injected,
        metamaskSDKWallet,
        phantom,
        walletConnect,
        coinbaseWallet,
        ambireWallet,
      ],
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
        },
      ],
      appMetadata: {
        name: "GM",
        icon: "/image/wallet/airship.webp",
        description: "GM ☀️ first tweet&mint coin",
        recommendedInjectedWallets: [
          { name: "MetaMask", url: "https://metamask.io" },
          { name: "Coinbase", url: "https://wallet.coinbase.com/" },
        ],
        gettingStartedGuide: "getting started guide",
      },
      accountCenter: {
        desktop: {
          enabled: true,
        },
      },
    });

    setWeb3Onboard(onboard);
  }, []);
  const getProvider = useCallback(() => {
    if (!connectedWallet?.provider) {
      // console.error("No wallet connected");
      return null;
    }

    try {
      // Check if wallet is connected to the correct network
      if (
        connectedChain &&
        parseInt(connectedChain.id, 16) !== CURRENT_CHAIN.id
      ) {
        console.warn(
          `Wallet connected to wrong network: ${connectedChain.id}, expected: ${CURRENT_CHAIN.hexId}`
        );
      }

      // For Ambire wallet use modified provider
      if (connectedWallet.label === 'Ambire') {
        console.log("Creating modified provider for Ambire");
        
        // Create standard BrowserProvider
        const baseProvider = new ethers.BrowserProvider(
          connectedWallet.provider,
          "any"
        );
        
        // Intercept calls to methods that may not be supported by Ambire
        const ambireProvider = {
          ...baseProvider,
          
          // Override getBalance method
          getBalance: async (address: string) => {
            try {
              // First try standard method
              return await baseProvider.getBalance(address);
            } catch (error) {
              console.log("Error calling getBalance, using alternative method", error);
              
              // In case of error use API to get balance
              try {
                const response = await fetch(`https://base-sepolia.blockscout.com/api/v2/addresses/${address}`);
                if (response.ok) {
                  const data = await response.json();
                  if (data && data.coin_balance) {
                    return ethers.parseEther(data.coin_balance);
                  }
                }
              } catch (apiError) {
                console.error("Error querying API blockscout:", apiError);
              }
              
              // If all methods fail, return zero balance
              console.warn("Failed to get balance, returning 0");
              return BigInt(0);
            }
          },
          
          // Add getSigner method for compatibility
          getSigner: async () => {
            return await baseProvider.getSigner();
          },
          
          // Add getFeeData method for compatibility
          getFeeData: async () => {
            try {
              return await baseProvider.getFeeData();
            } catch (error) {
              console.error("Error calling getFeeData:", error);
              // Return default values if the method fails
              return {
                gasPrice: BigInt(10000000000), // 10 gwei default
                maxFeePerGas: null,
                maxPriorityFeePerGas: null
              };
            }
          },
          
          // Need to override call method
          call: async (transaction: any) => {
            try {
              return await baseProvider.call(transaction);
            } catch (error: any) {
              console.error("Error calling call:", error);
              
              // Check if error is related to eth_ methods
              if (error.message) {
                // Handle eth_getBalance errors
                if (error.message.includes("eth_getBalance")) {
                  console.warn("Problem with eth_getBalance, returning zero result");
                  return "0x0";
                }
                
                // Handle "could not coalesce error" or code 4200 errors (unsupported methods)
                if (error.message.includes("could not coalesce error") || 
                    error.message.includes("Provider does not support") || 
                    (error.code && error.code === 4200)) {
                  console.warn("Provider does not support requested method, returning default value");
                  
                  // For call transactions that might be requesting balance
                  if (transaction && 
                      (transaction.data === '0x70a08231' || 
                       (transaction.data && transaction.data.startsWith('0x70a08231')))) {
                    console.log("Balance request detected, returning empty balance");
                    return "0x0";
                  }
                  
                  // For other method calls return empty result
                  return "0x";
                }
              }
              
              throw error; // Propagate other errors
            }
          }
        };
        
        // Add network event handler
        baseProvider.on(
          "network",
          (
            newNetwork: { chainId: number },
            oldNetwork: { chainId: number } | null
          ) => {
            if (oldNetwork && newNetwork.chainId !== oldNetwork.chainId) {
              console.log(
                `Network changed from ${oldNetwork.chainId} to ${newNetwork.chainId}`
              );

              // If network changed to incorrect, show warning
              if (newNetwork.chainId !== CURRENT_CHAIN.id) {
                console.warn(
                  `Network changed to incorrect network: ${newNetwork.chainId}, expected: ${CURRENT_CHAIN.id}`
                );
              }
            }
          }
        );
        
        return ambireProvider;
      }

      // Use BrowserProvider instead of Web3Provider for non-Ambire wallets
      const provider = new ethers.BrowserProvider(
        connectedWallet.provider,
        "any"
      );

      // Add network error handler
      provider.on(
        "network",
        (
          newNetwork: { chainId: number },
          oldNetwork: { chainId: number } | null
        ) => {
          if (oldNetwork && newNetwork.chainId !== oldNetwork.chainId) {
            console.log(
              `Network changed from ${oldNetwork.chainId} to ${newNetwork.chainId}`
            );

            // If network changed to incorrect, show warning
            if (newNetwork.chainId !== CURRENT_CHAIN.id) {
              console.warn(
                `Network changed to incorrect network: ${newNetwork.chainId}, expected: ${CURRENT_CHAIN.id}`
              );
            }
          }
        }
      );

      return provider;
    } catch (error) {
      console.error("Error getting provider:", error);
      return null;
    }
  }, [connectedWallet, connectedChain]);

  const getSigner = async () => {
    const provider = getProvider();
    return await provider?.getSigner();
  };
  const connect = async () => {
    if (!web3Onboard) return;

    try {
      // Connect wallet
      const wallets = await web3Onboard.connectWallet();
      console.log("wallets", wallets.length, wallets);

      if (wallets.length > 0) {
        setConnectedWallet(wallets[0]);

        // Use new function for network switching
        await handleSwitchNetwork(wallets[0]);

        // Set network change listener
        web3Onboard.state.select("chains").subscribe((chains: Chain[]) => {
          console.log("chains sub", chains.length, chains);
          if (chains && chains.length > 0) {
            const newChain = chains[0];
            setConnectedChain(newChain);

            // Check if new network matches required
            const newChainId = parseInt(newChain.id, 16);
            if (newChainId !== CURRENT_CHAIN.id) {
              console.warn(
                `⚠️ Connected to incorrect network: ${newChain.label} (${newChainId}), required: ${CURRENT_CHAIN.label} (${CURRENT_CHAIN.id})`
              );
            } else {
              console.log(
                `✅ Connected to correct network: ${newChain.label} (${newChainId})`
              );
            }
          }
        });
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };
  const createAmbireWallet = async () => {
    try {
      const ambireLoginSDK = new AmbireLoginSDK({
        dappName: "GM",
        dappIconPath:
          "https://pbs.twimg.com/profile_images/1834344421984256000/AcWFYzUl_400x400.jpg",
      });

      // Add event listeners for Ambire
      ambireLoginSDK.onLoginSuccess((data: { address: string; chainId: number; providerUrl: string }) => {
        console.log("Ambire login success:", data);
        // After successful login, check and switch network
        if (web3Onboard) {
          web3Onboard.connectWallet().then(wallets => {
            if (wallets.length > 0 && data.chainId !== CURRENT_CHAIN.id) {
              // Force network switch after small delay
              setTimeout(() => {
                handleSwitchNetwork(wallets[0]);
              }, 1000);
            }
          });
        }
      });
      
      ambireLoginSDK.onRegistrationSuccess((data: { address: string; chainId: number; providerUrl: string }) => {
        console.log("Ambire registration success:", data);
        // After successful registration, update state and connect to web3Onboard
        if (web3Onboard) {
          web3Onboard.connectWallet();
        }
      });
      
      ambireLoginSDK.onAlreadyLoggedIn((data: { address: string; chainId: number; providerUrl: string }) => {
        console.log("Ambire already logged in:", data);
        // User is already logged in, connect to web3Onboard
        if (web3Onboard) {
          web3Onboard.connectWallet().then(wallets => {
            if (wallets.length > 0 && data.chainId !== CURRENT_CHAIN.id) {
              // Force network switch after small delay
              setTimeout(() => {
                handleSwitchNetwork(wallets[0]);
              }, 1000);
            }
          });
        }
      });
      
      ambireLoginSDK.onLogoutSuccess(() => {
        console.log("Ambire logout success");
        // Disconnect wallet from web3Onboard if it was connected
        if (web3Onboard && connectedWallet && connectedWallet.label === 'Ambire') {
          web3Onboard.disconnectWallet(connectedWallet);
        }
      });

      // Open login modal
      ambireLoginSDK.openLogin({ chainId: CURRENT_CHAIN.id });
      console.log("Ambire Wallet login modal opened!");
      
      return ambireLoginSDK;
    } catch (error) {
      console.error("Error creating Ambire Wallet:", error);
      return null;
    }
  };
  const disconnect = async () => {
    if (!web3Onboard || !connectedWallet) {
      console.log("No wallet or onboard to disconnect");
      return;
    }
  
    try {
      console.log("Starting wallet disconnection process");
  
      // Remove provider, instance, icon, accounts, chains and wagmiConnector fields
      const { icon, instance, provider, accounts, chains, wagmiConnector, ...walletForDisconnect } = connectedWallet as any;
  
      // Additional handling for Ambire wallet
      if (walletForDisconnect.label === 'Ambire') {
        try {
          const ambireLoginSDK = new AmbireLoginSDK({
            dappName: "GM",
            dappIconPath: "GM",
          });
          ambireLoginSDK.openLogout();
        } catch (ambireError) {
          console.error("Error with Ambire logout, continuing with standard disconnect:", ambireError);
        }
      }
  
      // Clear UI state
      setConnectedWallet(null);
      setConnectedChain(null);
  
      // Perform disconnection in Web3Onboard
      try {
        await web3Onboard.disconnectWallet(walletForDisconnect);
        console.log(`Wallet ${walletForDisconnect.label} disconnected successfully`);
      } catch (disconnectError) {
        console.error("Error during wallet disconnection:", disconnectError);
      }
    } catch (error) {
      console.error("Error in disconnect function:", error);
      setConnectedWallet(null);
      setConnectedChain(null);
    }
  };
  
  
  
  // Replace function for explicit network switching
  const handleSwitchNetwork = async (wallet: WalletState) => {
    console.log("handleSwitchNetwork called for wallet:", wallet.label);
    
    if (!web3Onboard) return false;
    
    try {
      // Check current network
      const currentChain = wallet.chains?.[0];
      if (currentChain) {
        const currentChainId = parseInt(currentChain.id, 16);
        console.log(`Network check: current ${currentChainId}, target ${CURRENT_CHAIN.id}`);
        
        // If network doesn't match required, switch it
        if (currentChainId !== CURRENT_CHAIN.id) {
          console.log(`Wrong network: ${currentChainId}, required ${CURRENT_CHAIN.id}`);
          console.log("Wrong network, attempting to switch...");
          
          // For Ambire wallet and other mobile devices
          // Use direct method with wallet_addEthereumChain instead of wallet_switchEthereumChain
          try {
            // Check UserAgent to detect mobile device
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            // First try simplified method on mobile devices
            if (isMobile || wallet.label === 'Ambire') {
              console.log("Using direct provider method for network switching");
              
              // Create provider from current wallet
              const provider = new ethers.BrowserProvider(wallet.provider);
              
              // First try to add the network (this will work even if the network already exists)
              await provider.send('wallet_addEthereumChain', [{
                chainId: CURRENT_CHAIN.hexId,
                chainName: CURRENT_CHAIN.label,
                nativeCurrency: {
                  name: CURRENT_CHAIN.token,
                  symbol: CURRENT_CHAIN.token,
                  decimals: 18
                },
                rpcUrls: [CURRENT_CHAIN.rpcUrl],
                blockExplorerUrls: [CURRENT_CHAIN.blockExplorerUrl]
              }]).catch(e => {
                console.log("Error adding chain, proceeding to switch:", e);
              });
              
              // Then try to switch to this network
              await provider.send('wallet_switchEthereumChain', [{ 
                chainId: CURRENT_CHAIN.hexId 
              }]);
              
              console.log(`Sent direct switch request to network ${CURRENT_CHAIN.label}`);
              
              // Check switching result after 2 seconds
              setTimeout(async () => {
                try {
                  const updatedChainId = await provider.send('eth_chainId', []);
                  const newChainId = parseInt(updatedChainId, 16);
                  
                  console.log(`Verification: chain ID now ${newChainId}, target is ${CURRENT_CHAIN.id}`);
                  
                  if (newChainId === CURRENT_CHAIN.id) {
                    console.log(`✅ Successfully verified switch to ${CURRENT_CHAIN.label}`);
                    // Force update UI state
                    updateNetworkState(CURRENT_CHAIN.hexId);
                  } else {
                    console.warn(`⚠️ Network switch verification failed, trying again once more`);
                    
                    // One additional switching attempt
                    try {
                      await provider.send('wallet_switchEthereumChain', [{ 
                        chainId: CURRENT_CHAIN.hexId 
                      }]);
                      
                      // Ask user to switch manually
                      console.log("Asking user to manually switch network");
                      showNetworkSwitchModal(wallet);
                    } catch (retryError) {
                      console.error("Second attempt failed:", retryError);
                      showNetworkSwitchModal(wallet);
                    }
                  }
                } catch (verifyError) {
                  console.error("Error verifying chain switch:", verifyError);
                  showNetworkSwitchModal(wallet);
                }
              }, 2000);
              
              return true;
            }
            
            // Standard method for desktop wallets
            const success = await web3Onboard.setChain({
              chainId: CURRENT_CHAIN.hexId,
            });

            if (success) {
              console.log(`✅ Successfully switched to network ${CURRENT_CHAIN.label}`);
              return true;
            } else {
              console.warn(`⚠️ Standard method failed, trying direct method`);
              
              // Fallback method - direct call to wallet_switchEthereumChain
              const provider = new ethers.BrowserProvider(wallet.provider);
              await provider.send('wallet_switchEthereumChain', [{ 
                chainId: CURRENT_CHAIN.hexId 
              }]);
              
              // Check result after 1.5 seconds
              setTimeout(async () => {
                try {
                  const chainId = await provider.send('eth_chainId', []);
                  if (parseInt(chainId, 16) === CURRENT_CHAIN.id) {
                    updateNetworkState(CURRENT_CHAIN.hexId);
                  } else {
                    showNetworkSwitchModal(wallet);
                  }
                } catch (e) {
                  showNetworkSwitchModal(wallet);
                }
              }, 1500);
              
              return true;
            }
          } catch (error) {
            console.error("All network switching methods failed:", error);
            // Show modal window for manual switching
            showNetworkSwitchModal(wallet);
            return false;
          }
        } else {
          console.log(`✅ Already connected to correct network ${CURRENT_CHAIN.label} (${CURRENT_CHAIN.id})`);
          return true;
        }
      }
    } catch (error) {
      console.error("Error in handleSwitchNetwork:", error);
      showNetworkSwitchModal(wallet);
      return false;
    }
    
    return false;
  };

  // Function to update network state in UI
  const updateNetworkState = (chainId: string) => {
    if (web3Onboard) {
      web3Onboard.state.select("chains").subscribe((chains: Chain[]) => {
        const targetChain = chains.find(chain => chain.id === chainId);
        if (targetChain) {
          setConnectedChain(targetChain);
        }
      });
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
    getSigner,
    handleSwitchNetwork,
  };
};

async function switchToBase() {
  console.log("switchToBase..");
  const baseChainId = CURRENT_CHAIN.hexId;

  const windowEthereum = window.ethereum;
  if (!windowEthereum) {
    return;
  }

  try {
    // Check the current chain ID
    const currentChainId = await windowEthereum.request({
      method: "eth_chainId",
    });
    console.log("currentChainId", currentChainId);

    if (currentChainId !== baseChainId) {
      // Attempt to switch to Base network
      await windowEthereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: baseChainId }],
      });
    }

    console.log(`Connected to ${CURRENT_CHAIN.label} network`);
  } catch (switchError: any) {
    // If Base isn't added, add it first
    if (switchError.code && switchError.code === 4902) {
      try {
        await windowEthereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: baseChainId,
              chainName: CURRENT_CHAIN.label,
              nativeCurrency: {
                name: "Base",
                symbol: "ETH",
                decimals: 18,
              },
              rpcUrls: [CURRENT_CHAIN.rpcUrl],
              blockExplorerUrls: [CURRENT_CHAIN.blockExplorerUrl],
            },
          ],
        });

        // After adding, switch to Base
        await windowEthereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: baseChainId }],
        });

        console.log(`${CURRENT_CHAIN.label} network added and switched`);
      } catch (addError) {
        console.error(
          `Failed to add ${CURRENT_CHAIN.label} network:`,
          addError
        );
      }
    } else {
      console.error(
        `Failed to switch to ${CURRENT_CHAIN.label} network:`,
        switchError
      );
    }
  }
}