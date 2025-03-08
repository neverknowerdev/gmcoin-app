"use client";

import React, { useEffect, useState } from "react";
import { ethers, Contract } from "ethers";
import { useWeb3 } from "@/src/hooks/useWeb3";
import TwitterConnect from "@/src/components/TwitterConnect";
import { generateCodeVerifier, generateCodeChallenge } from "@/src/utils/auth";
import styles from "./page.module.css";
import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  API_URL,
  TWITTER_CLIENT_ID,
} from "@/src/config";
import ConnectWallet from "../components/connectWallet/ConnectWallet";
import SendContract from "../components/SendContract/SendContract";
import SunLoader from "../components/loader/loader";
import { useWallet } from "../context/WalletContext";
import ProgressNavigation from "../components/ProgressNavigation/ProgressNavigation";
import { getErrorMessage } from "../hooks/errorHandler";

export default function Home() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isTwitterConnected, setIsTwitterConnected] = useState(false);
  const [isTwitterLoading, setIsTwitterLoading] = useState(true);
  const [transactionStatus, setTransactionStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const {
    connectedWallet,
    connect,
    createAmbireWallet,
    disconnect,
    getSigner,
    getProvider,
  } = useWeb3();
  const { updateWalletInfo } = useWallet();

  useEffect(() => {
    if (connectedWallet && currentStep === 0) {
      setCurrentStep(1);
    }
  }, [connectedWallet, currentStep]);

  useEffect(() => {
    if (connectedWallet?.accounts[0]?.address) {
      updateWalletInfo(connectedWallet.accounts[0].address);
    }
  }, [connectedWallet]);

  useEffect(() => {
    const checkTwitterAuth = () => {
      const params = new URLSearchParams(window.location.search);
      const authorizationCode = params.get("code");

      if (authorizationCode) {
        console.log("Found authorization code in URL");
        setIsTwitterConnected(true);
        sessionStorage.setItem("code", authorizationCode);
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        setCurrentStep(2);
        if (connectedWallet) {
          setCurrentStep(2);
        }
      } else {
        const storedCode = sessionStorage.getItem("code");
        if (storedCode) {
          setIsTwitterConnected(true);
        }
      }
      setIsTwitterLoading(false);
    };
    checkTwitterAuth();
  }, []);

  const openTwitterAuthPopup = async () => {
    if (typeof window === "undefined") return;

    setIsTwitterLoading(true);
    const codeVerifier = generateCodeVerifier();
    sessionStorage.setItem("verifier", codeVerifier);

    const codeChallenge = await generateCodeChallenge(codeVerifier);
    console.log("Generated challenge:", codeChallenge);

    const redirectUri = encodeURIComponent(
      window.location.origin + window.location.pathname
    );
    const twitterAuthUrl = `https://x.com/i/oauth2/authorize?response_type=code&client_id=${TWITTER_CLIENT_ID}&redirect_uri=${redirectUri}&scope=users.read%20tweet.read&state=state123&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    window.location.href = twitterAuthUrl;
  };

  // Function to poll for the specific TwitterVerificationResult event
  const pollForTwitterVerificationEvent = async (
    txHash: string,
    walletAddress: string,
    twitterUserId: string,
    maxAttempts = 30,
    intervalMs = 6000
  ) => {
    console.log(`🔍 Polling for TwitterVerificationResult event for tx: ${txHash}`);
    console.log(`👤 Twitter User ID: ${twitterUserId}`);
    console.log(`👛 Wallet Address: ${walletAddress}`);
    
    // Use HTTP provider for polling
    const httpProvider = new ethers.JsonRpcProvider(
      "https://base-sepolia.infura.io/v3/46c83ef6f9834cc49b76640eededc9f5"
    );
    
    // Create contract instance
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      httpProvider
    );
    
    // Get the Twitter verification event signature
    // From logs we can see this event has topic: 0xa5ad92a05a481deca6490891b32fb01290968d76ddd9b07af8e2e4079d8cc3ff
    const twitterVerificationEventTopic = "0xa5ad92a05a481deca6490891b32fb01290968d76ddd9b07af8e2e4079d8cc3ff";
    console.log(`🎯 Looking for event with topic: ${twitterVerificationEventTopic}`);
    
    // Also get the second topic that should contain our wallet address
    const walletAddressTopic = ethers.zeroPadValue(
      walletAddress.toLowerCase(),
      32
    ).toLowerCase();
    console.log(`🔑 Wallet address as topic: ${walletAddressTopic}`);
    
    let attempts = 0;
    
    // Helper function to check for the specific event
    const checkForEvent = async () => {
      try {
        const receipt = await httpProvider.getTransactionReceipt(txHash);
        
        if (!receipt) {
          console.log(`⏳ Transaction ${txHash} not yet mined. Waiting...`);
          return null;
        }
        
        console.log(`📜 Transaction mined with ${receipt.logs.length} logs`);
        
        // Check each log for our specific event
        for (const log of receipt.logs) {
          // Check if this log is from our contract
          if (log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
            continue;
          }
          
          console.log(`📄 Examining log: Topics=${JSON.stringify(log.topics)}`);
          
          // Check if first topic matches our event signature
          if (log.topics[0].toLowerCase() === twitterVerificationEventTopic.toLowerCase()) {
            console.log(`🎯 Found log with matching event topic!`);
            
            // Check if second topic contains our wallet address
            if (log.topics[1].toLowerCase() === walletAddressTopic.toLowerCase()) {
              console.log(`✅ Wallet address match confirmed!`);
              
       
                // Try to decode the event data using the contract interface
                console.log(`📊 Raw log data:`, log.data);
                console.log(`📊 Raw log topics:`, log.topics);
                
 
                  return {
                    found: true,
                    isSuccess: true,
                    errorMsg: ""
                  };
                
              
            } else {
              console.log(`❌ Wallet address in event doesn't match our wallet`);
            }
          }
        }
        
        // If we got here, we didn't find our specific event
        return { found: false };
      } catch (error: any) {
        console.error(`❌ Error checking for event: ${error.message}`);
        return null;
      }
    };
    
    // Use polling with increasing delay
    return new Promise((resolve, reject) => {
      const poll = async () => {
        if (attempts >= maxAttempts) {
          console.log(`⚠️ Maximum polling attempts (${maxAttempts}) reached`);
          reject(new Error(`Verification event not found after ${maxAttempts} attempts`));
          return;
        }
        
        attempts++;
        console.log(`📊 Polling attempt ${attempts}/${maxAttempts}`);
        
        const result = await checkForEvent();
        
        if (result === null) {
          // Transaction not yet mined, continue polling
          setTimeout(poll, intervalMs);
        } else if (!result.found) {
          // Transaction mined but our event not found, continue polling
          setTimeout(poll, intervalMs + (attempts * 1000));
        } else {
          // Event found!
          if (result.isSuccess) {
            console.log(`🎉 Found successful verification event!`);
            resolve("success");
          } else {
            console.log(`❌ Found verification event but it indicates failure: ${result.errorMsg}`);
            reject(new Error(result.errorMsg || "Verification failed"));
          }
        }
      };
      
      // Start polling
      poll();
    });
  };

  const sendTransaction = async (): Promise<void> => {
    if (!connectedWallet) {
      console.log("❌ Wallet is not connected. Connecting...");
      await connect();
      return;
    }

    const encryptedAccessToken = sessionStorage.getItem('encryptedAccessToken');
    const accessToken = sessionStorage.getItem('accessToken');
    const twitterUserId = localStorage.getItem('twitterUserId');

    console.log('encryptedAccessToken', encryptedAccessToken);
    console.log('twitterUserId', twitterUserId);

    try {
      setTransactionStatus("pending");
      console.log("🚀 Sending transaction...");

      const browserProvider = getProvider();
      const signer = await getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const address = await signer.getAddress();
      const balance = await browserProvider.getBalance(address);
      console.log(`💰 User balance: ${ethers.formatEther(balance)} ETH`);

      const estimatedGas =
        await contract.requestTwitterVerification.estimateGas(
          encryptedAccessToken,
          twitterUserId
        );
      console.log(`⛽ Estimated gas: ${estimatedGas.toString()}`);

      const gasPrice = await browserProvider.getFeeData();
      const totalGasCost = BigInt(estimatedGas) * gasPrice.gasPrice!;
      console.log(`💰 Gas cost: ${ethers.formatEther(totalGasCost)} ETH`);

      let txHash;

      // Direct contract call path
      if (balance > totalGasCost * 2n) {
        console.log("🔹 Sending contract transaction...");
        try {
          const tx = await contract.requestTwitterVerification(
            encryptedAccessToken,
            twitterUserId
          );
          txHash = tx.hash;
          console.log("📝 Transaction sent with hash:", txHash);
          
          // First, wait for the transaction to be mined
          console.log("⏳ Waiting for transaction confirmation...");
          await tx.wait(1);
          console.log("✅ Transaction confirmed on-chain!");
        } catch (txError: any) {
          console.error("❌ Transaction execution error:", txError);
          throw new Error(`Transaction failed: ${txError.message}`);
        }
      } 
      // API relay path
      else {
        console.log("🔹 Using API relay...");
        try {
          const signature = await signer.signMessage(
            "gmcoin.meme twitter-verification"
          );
          
          console.log("✅ Signature created, calling API...");
          const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accessToken,
              signature
            }),
          });

          if (!response.ok) {
            throw new Error(
              `API Error: ${response.status} ${response.statusText}`
            );
          }

          const responseData = await response.json();
          console.log("✅ API call successful:", responseData);
          
          if (responseData.txHash) {
            txHash = responseData.txHash;
            console.log("📝 API returned transaction hash:", txHash);
          } else {
            throw new Error("API response didn't include transaction hash");
          }
        } catch (apiError: any) {
          console.error("❌ API Error:", apiError);
          throw new Error(`Relayer service error: ${apiError.message}`);
        }
      }

      if (!txHash) {
        throw new Error("No transaction hash received");
      }

      try {
        // Now that we have a transaction hash, poll for the specific event
        console.log(`⏳ Waiting for Twitter verification event...`);
        
        // Set up a timeout promise to auto-resolve after 2 minutes if needed
        const timeoutPromise = new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error("Verification event polling timed out after 2 minutes"));
          }, 120000); // 2 minutes
        });
        
        try {
          // Race between polling and timeout
          await Promise.race([
            pollForTwitterVerificationEvent(txHash!, address, twitterUserId!),
            timeoutPromise
          ]);
          
          // If we get here, we found the successful event
          console.log("🎉 Twitter verification successfully completed!");
          setTransactionStatus("success");
          sessionStorage.removeItem("code");
          sessionStorage.removeItem("verifier");
        } catch (eventError: any) {
          console.error("❌ Verification Error:", eventError);
          
          // We could check transaction receipt as a fallback here
          console.log("⚠️ Specific event not found. Transaction might still be successful.");
          
          // For now, let's fail if we can't find the specific event
          setErrorMessage(`Verification event not found: ${eventError.message}`);
          setTransactionStatus("error");
          throw eventError;
        }
      } catch (error: any) {
        console.error("❌ Verification process error:", error);
        throw error;
      }
    } catch (error: any) {
      console.error("❌ Transaction Error:", error);
      setErrorMessage(getErrorMessage(error));
      setTransactionStatus("error");
      throw error;
    }
  };

  const handleStepChange = (newStep: number) => {
    setCurrentStep(newStep);
  };

  const handleBack = async () => {
    if (currentStep === 2) {
      setCurrentStep(1);
      setTransactionStatus("idle");
      sessionStorage.removeItem("code");
      sessionStorage.removeItem("verifier");
      setIsTwitterConnected(false);
    } else if (currentStep === 1) {
      setCurrentStep(0);
      await disconnect();
    } else if (currentStep === 0) {
      setIsTwitterConnected(false);
      sessionStorage.removeItem("code");
      sessionStorage.removeItem("verifier");
    }
  };

  if (isTwitterLoading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className={styles.loaderContainer}>
          <SunLoader />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <ProgressNavigation
        currentStep={currentStep}
        onBack={handleBack}
        onStepChange={handleStepChange}
      />
      {isAuthorized ? (
        <div className="p-4">Authorized!</div>
      ) : (
        <div>
          {currentStep === 0 && (
            <ConnectWallet
              onConnect={connect}
              createAmbireWallet={createAmbireWallet}
            />
          )}

          {currentStep === 1 && connectedWallet && (
            <TwitterConnect
              onConnectClick={openTwitterAuthPopup}
              isConnecting={false}
            />
          )}

          {isTwitterConnected && currentStep === 2 && (
            <SendContract
              connectedWallet={connectedWallet}
              walletAddress={connectedWallet?.accounts[0]?.address || ""}
              sendTransaction={sendTransaction}
              connect={connect}
            />
          )}
        </div>
      )}
    </main>
  );
}