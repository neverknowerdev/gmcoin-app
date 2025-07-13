"use client";

import { useEffect, useMemo, useState } from "react";
import AccountButton from "../../../components/AccountButton";

import { useWatchContractEvent, useSendCalls, useCapabilities, useWriteContract } from 'wagmi';
import type { Log } from 'viem';
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import BlueButton from "../../../components/ui/buttons/BlueButton";
import Modal from "../../../components/ui/modal/Modal";
import SunLoader from "../../../components/ui/loader/loader";
import { baseSepolia } from "viem/chains";
import { base } from "viem/chains";
import { useAppKit, useAppKitAccount, useDisconnect } from "@reown/appkit/react";
import { RefreshCw } from "lucide-react";

import { CONTRACT_ADDRESS } from "../../../config/contracts";
import SplashScreen from "../../../components/ui/splash-screen/splash-screen";
import { useTracking } from "../../../hooks/useTracking";

export default function SendTransaction() {
  const [authCode, setAuthCode] = useState<string | null>(null);
  const [xUsername, setXUsername] = useState<string | null>(null);
  const [xUserID, setXUserID] = useState<string | null>(null);
  const [xTweetID, setXTweetID] = useState<string | null>(null);
  const [encryptedAccessToken, setEncryptedAccessToken] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isSendingTransaction, setIsSendingTransaction] = useState(false);
  const [isTransactionSentSuccessfully, setIsTransactionSentSuccessfully] = useState(false);

  const { writeContract, isPending: isWritingContract, isSuccess: isWriteContractSuccess, isError: isWriteContractError, error: writeContractError } = useWriteContract();
  const { sendCalls, isPending: isSendingCalls, isSuccess: isSendCallsSuccess, isError: isSendCallsError, error: sendCallsError } = useSendCalls();

  useEffect(() => {
    if (isWriteContractSuccess) {
      setIsTransactionSentSuccessfully(true);
    }
  }, [isWriteContractSuccess]);

  useEffect(() => {
    if (isWritingContract) {
      setIsSendingTransaction(true);
    }
  }, [isWritingContract]);

  useEffect(() => {
    if (isWriteContractError) {
      setVerificationStatus('error');
      setErrorMessage(writeContractError?.message);
    }
  }, [isWriteContractError]);

  useEffect(() => {
    if (isSendCallsSuccess) {
      setIsTransactionSentSuccessfully(true);
    }
  }, [isSendCallsSuccess]);

  useEffect(() => {
    if (isSendingCalls) {
      setIsSendingTransaction(true);
    }
  }, [isSendingCalls]);

  useEffect(() => {
    if (isSendCallsError) {
      setVerificationStatus('error');
      setErrorMessage(sendCallsError?.message);
    }
  }, [isSendCallsError]);

  const { address, isConnected, status } = useAppKitAccount();
  const { disconnect } = useDisconnect();
  const { trackPageVisit, trackTransactionSent, trackVerificationSuccess, trackError, trackGMTweet } = useTracking();

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status == "connecting") {
      setIsLoading(true);
    }
    if (status == "connected") {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    const storedAuthCode = localStorage.getItem("authCode");
    const storedXUsername = localStorage.getItem("xUsername");
    const storedXUserID = localStorage.getItem("xUserID");
    const storedXTweetID = localStorage.getItem("xTweetID");
    const storedEncryptedAccessToken = localStorage.getItem("encryptedAccessToken");
    setAuthCode(storedAuthCode);
    setXUsername(storedXUsername);
    setXUserID(storedXUserID);
    setXTweetID(storedXTweetID);
    setEncryptedAccessToken(storedEncryptedAccessToken);
    
    trackPageVisit("Send Transaction");
  }, [trackPageVisit]);

  const router = useRouter();

  const chain = process.env.NEXT_PUBLIC_ENV === 'mainnet' ? base : baseSepolia;
  const contractAddress = CONTRACT_ADDRESS;

  const { data: availableCapabilities } = useCapabilities();

  const paymasterCapabilities = useMemo(() => {
    if (!availableCapabilities || !chain.id) return {};
    const capabilitiesForChain = availableCapabilities[chain.id];

    if (capabilitiesForChain && capabilitiesForChain.paymasterService && capabilitiesForChain.paymasterService.supported) {
      return {
        paymasterService: {
          supported: true,
          url: process.env.NEXT_PUBLIC_PAYMASTER_URL!
        }
      };
    }

  }, [availableCapabilities, chain.id]);

  useEffect(() => {
    if (isWriteContractError) {
      setVerificationStatus('error');
      setErrorMessage(writeContractError?.message);
    }
  }, [isWriteContractError]);

  // Watch for TwitterVerificationResult events
  useWatchContractEvent({
    address: contractAddress as `0x${string}`,
    abi: [{
      type: 'event',
      name: 'TwitterVerificationResult',
      inputs: [
        { type: 'string', name: 'userID', indexed: false },
        { type: 'address', name: 'wallet', indexed: true },
        { type: 'bool', name: 'isSuccess', indexed: false },
        { type: 'string', name: 'errorMsg', indexed: false }
      ]
    }] as const,
    eventName: 'TwitterVerificationResult',
    args: {
      wallet: address as `0x${string}`
    },
    onLogs: (logs) => {
      const event = logs[0] as Log & { args: { isSuccess: boolean; errorMsg: string } };
      if (event.args.isSuccess) {
        setVerificationStatus('success');
        setErrorMessage(null);
        trackVerificationSuccess();
      } else {
        setVerificationStatus('error');
        setErrorMessage(event.args.errorMsg);
        trackError("verification_failed", event.args.errorMsg);
      }
    },
    enabled: isTransactionSentSuccessfully && !!address
  });

  // Contract function ABIs
  const contractFunctions = {
    requestTwitterVerificationByAuthCode: {
      type: 'function',
      name: 'requestTwitterVerificationByAuthCode',
      inputs: [
        { type: 'string', name: 'authCode' },
        { type: 'string', name: 'userID' },
        { type: 'string', name: 'tweetID' }
      ],
      outputs: [],
      stateMutability: 'nonpayable'
    },
    requestTwitterVerification: {
      type: 'function',
      name: 'requestTwitterVerification',
      inputs: [
        { type: 'string', name: 'accessCodeEncrypted' },
        { type: 'string', name: 'userID' }
      ],
      outputs: [],
      stateMutability: 'nonpayable'
    }
  } as const;

  const handleSendTransaction = async () => {
    if (!address) {
      setVerificationStatus('error');
      setErrorMessage("No wallet address found");
      trackError("no_wallet_address", "No wallet address found");
      console.error("No wallet address found");
      return;
    }

    setVerificationStatus('pending');
    setErrorMessage(null);

    let functionDataObj: any;
    if (authCode && xUserID && xTweetID) {
      functionDataObj = {
        abi: [contractFunctions.requestTwitterVerificationByAuthCode],
        functionName: 'requestTwitterVerificationByAuthCode',
        args: [authCode, xUserID, xTweetID],
      }
    } else if (encryptedAccessToken && xUserID) {
      functionDataObj = {
        abi: [contractFunctions.requestTwitterVerification],
        functionName: 'requestTwitterVerification',
        args: [encryptedAccessToken, xUserID],
      };
    } else {
      setVerificationStatus('error');
      setErrorMessage("Neither authCode with xUserID and xTweetID nor encryptedAccessToken is available");
      console.error("Neither authCode with xUserID and xTweetID nor encryptedAccessToken is available");
      return;
    }

    if (paymasterCapabilities && paymasterCapabilities.paymasterService && paymasterCapabilities.paymasterService.supported) {
      try {
        setIsSendingTransaction(true);
        trackTransactionSent("verification_with_paymaster");
        
        const result = sendCalls({
          calls: [{
            ...functionDataObj,
            to: contractAddress as `0x${string}`
          }],
          capabilities: paymasterCapabilities
        });

        setIsTransactionSentSuccessfully(true);
        setVerificationStatus('success');
        setErrorMessage(null);
      } catch (error: any) {
        setVerificationStatus('error');
        setErrorMessage(error.message);
        trackError("paymaster_transaction_failed", error.message);
      } finally {
        setIsSendingTransaction(false);
      }
    } else {
      trackTransactionSent("verification_standard");
      functionDataObj.address = contractAddress as `0x${string}`;
      writeContract(functionDataObj);
    }
  };

  const handleReconnectWalletClick = async () => {
    localStorage.removeItem('authCode');
    localStorage.removeItem('xUsername');
    localStorage.removeItem('xUserID');
    localStorage.removeItem('xTweetID');
    localStorage.removeItem('encryptedAccessToken');

    await disconnect();

    router.push('/login');
  };

  const handleReconnectXClick = () => {
    localStorage.removeItem('authCode');
    localStorage.removeItem('xUsername');
    localStorage.removeItem('xUserID');
    localStorage.removeItem('xTweetID');
    localStorage.removeItem('encryptedAccessToken');

    router.push('/login');
  };

  const formatAddress = (address: string) => {
    if (!address || address === "Please connect wallet")
      return "Please connect wallet";
    return `${address.slice(0, 8)}...${address.slice(-4)}`;
  };

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <SplashScreen isLoading={isLoading} />
      <div className="w-full container min-h-screen">
        <div className={styles.rainbow}>
          <img src="/image/contract/rainbow.webp" alt="Rainbow" />
        </div>
        <div className={styles.balloon}>
          <img src="/image/contract/ballon.webp" alt="Hot Air Balloon" />
        </div>
        {/* Top navigation bar with AccountButton */}
        <div className="w-full flex justify-end" style={{ marginTop: '20px', marginRight: '20px' }}>
          <AccountButton />
        </div>


        <div className="flex flex-col items-center justify-center">
          <p className={styles.title}>SEND TRANSACTION</p>
          <div className={styles.form}>
            <label className={styles.label}>WALLET ADDRESS</label>
            <div className={styles.inputGroup}>
              <input
                type="text"
                placeholder="Enter Wallet..."
                value={formatAddress(address!)}
                className={styles.input}
                readOnly={true}
              />

              <button
                className={styles.reconnectButton}
                onClick={handleReconnectWalletClick}
              >
                <RefreshCw size={20} className={styles.reconnectIcon} /> reconnect
              </button>

            </div>
            <label className={styles.label}>TWITTER USERNAME</label>
            <div className={styles.inputGroup}>
              <input
                type="text"
                placeholder="Enter Twitter..."
                value={xUsername || "Not connected"}
                className={styles.input}
                readOnly={true}
              />

              <button
                className={styles.reconnectButton}
                onClick={handleReconnectXClick}
              >
                <RefreshCw size={20} className={styles.reconnectIcon} /> reconnect
              </button>

            </div>

            <div className={styles.buttonContainer}>
              <BlueButton onClick={handleSendTransaction}>SEND</BlueButton>
            </div>
          </div>
        </div>

        {verificationStatus === 'pending' && (
          <Modal onClose={() => { setVerificationStatus('idle') }}>
            <div className="flex justify-center items-center" style={{ marginBottom: '50px' }}>
              <SunLoader />
            </div>
            <div style={{ marginBottom: '50px' }}>
              {isSendingTransaction && !isTransactionSentSuccessfully && (
                <p>Sending transaction...</p>
              )}
              {isTransactionSentSuccessfully && (
                <p>Transaction sent, verifying your Twitter account on smart-contract..</p>
              )}
            </div>
          </Modal>
        )}

        {verificationStatus === 'success' && (
          <Modal onClose={() => { setVerificationStatus('idle'); }}>
            <div className={styles.modalContent}>
              <p>
                🎉 Well done!
                <br /> You're in. You can go to X and write "GM" and receive $GM coins automatically.
                <br />
                <br />
                Token are transferred to you once per day for the previous day's activity.
              </p>
              <img src="/image/sun.png" alt="Sun" className={styles.goodEmoji} />
              <a
                className={styles.twittButton}
                href={encodeURI(
                  'https://x.com/intent/tweet?text=Now I can get $GM for every "gm" tweet - awesome 🌀&via=say_more_gm'
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackGMTweet()}
              >
                <svg
                  className={styles.icon}
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
                </svg>
                Tweet GM
              </a>
              <a
                className={styles.twittButton}
                href="https://x.com/say_more_gm"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  className={styles.icon}
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13h-1v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
                </svg>
                Follow @say_more_gm
              </a>

              <button
                className={styles.successButton}
                onClick={() => {
                  // Redirect to dashboard
                  router.push("/");
                }}
              >
                GO TO DASHBOARD 🚀
              </button>
            </div>
          </Modal>
        )}

        {verificationStatus === 'error' && (
          <Modal onClose={() => { setVerificationStatus('idle') }}>
            <div>
              <div className="justify-center items-center">
                <p style={{ color: 'red' }}>Transaction is failed</p>
                <p style={{ maxHeight: '400px', overflowY: 'auto' }}>{errorMessage}</p>
                <div className="flex justify-center">
                  <button
                    style={{ maxWidth: '200px', marginTop: '20px' }}
                    onClick={() => {
                      setVerificationStatus('idle');
                    }}
                    className={styles.customBlueButton}
                  >
                    TRY AGAIN
                  </button>
                </div>
              </div>


            </div>
          </Modal>
        )}
      </div>
    </main >
  );
} 