"use client";

import { useEffect, useState } from "react";
import AccountButton from "../../../components/AccountButton";

import { useSendTransaction, useWatchContractEvent, useWriteContract } from 'wagmi';
import type { Log } from 'viem';
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import BlueButton from "../../../components/ui/buttons/BlueButton";
import Modal from "../../../components/ui/modal/Modal";
import SunLoader from "../../../components/ui/loader/loader";
import { baseSepolia } from "viem/chains";
import { base } from "viem/chains";
import { useAppKit, useAppKitAccount, useAppKitState, useDisconnect } from "@reown/appkit/react";
import { RefreshCw } from "lucide-react";
import { wagmiAdapter } from "../../../config/wagmi";
import { wagmiContractConfig } from "../../../config/contractAbi";

export default function SendTransaction() {
  const [authCode, setAuthCode] = useState<string | null>(null);
  const [xUsername, setXUsername] = useState<string | null>(null);
  const [xUserID, setXUserID] = useState<string | null>(null);
  const [xTweetID, setXTweetID] = useState<string | null>(null);
  const [encryptedAccessToken, setEncryptedAccessToken] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { writeContract, isPending: isWritingContract, isSuccess: isTransactionSuccess, isError: isTransactionError, error: transactionError } = useWriteContract({
    config: wagmiAdapter.wagmiConfig,
  });
  const { address, isConnected, status } = useAppKitAccount();
  const { disconnect } = useDisconnect();

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
  }, []);

  const router = useRouter();

  const chain = process.env.NEXT_PUBLIC_ENV === 'mainnet' ? base : baseSepolia;
  const contractAddress = process.env.NEXT_PUBLIC_ENV === 'mainnet'
    ? "0x26f36F365E5EB6483DF4735e40f87E96e15e0007"
    : "0x19bD68AD19544FFA043B2c3A5064805682783E91";

  useEffect(() => {
    if (isTransactionError) {
      setVerificationStatus('error');
      setErrorMessage(transactionError?.message as string);
    }
  }, [isTransactionError]);

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
      console.log("Logs:", logs);
      const event = logs[0] as Log & { args: { isSuccess: boolean; errorMsg: string } };
      if (event.args.isSuccess) {
        setVerificationStatus('success');
        setErrorMessage(null);
      } else {
        setVerificationStatus('error');
        setErrorMessage(event.args.errorMsg);
      }
    },
    enabled: isTransactionSuccess && !!address
  });

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

  const handleSendTransaction = () => {
    console.log("Sending transaction...");
    if (!address) {
      setVerificationStatus('error');
      setErrorMessage("No wallet address found");
      console.error("No wallet address found");
      return;
    }

    setVerificationStatus('pending');
    setErrorMessage(null);

    if (authCode && xUserID && xTweetID) {
      writeContract({
        ...wagmiContractConfig,
        address: contractAddress as `0x${string}`,
        abi: [{
          type: 'function',
          name: 'requestTwitterVerificationByAuthCode',
          inputs: [{ type: 'string', name: 'authCode' }, { type: 'string', name: 'userID' }, { type: 'string', name: 'tweetID' }],
          outputs: [],
          stateMutability: 'nonpayable'
        }],
        chainId: chain.id,
        functionName: 'requestTwitterVerificationByAuthCode',
        args: [authCode, xUserID, xTweetID],
      });
    } else if (encryptedAccessToken && xUserID) {
      writeContract({
        ...wagmiContractConfig,
        address: contractAddress as `0x${string}`,
        abi: [{
          type: 'function',
          name: 'requestTwitterVerification',
          inputs: [{ type: 'string', name: 'accessCodeEncrypted' }, { type: 'string', name: 'userID' }],
          outputs: [],
          stateMutability: 'nonpayable'
        }],
        chainId: chain.id,
        functionName: 'requestTwitterVerification',
        args: [encryptedAccessToken, xUserID],
      });
    } else {
      setVerificationStatus('error');
      setErrorMessage("Neither authCode with xUserID and xTweetID nor encryptedAccessToken is available");
      console.error("Neither authCode with xUserID and xTweetID nor encryptedAccessToken is available");
      return;
    }
  };

  const formatAddress = (address: string) => {
    if (!address || address === "Please connect wallet")
      return "Please connect wallet";
    return `${address.slice(0, 8)}...${address.slice(-4)}`;
  };

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
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
              {isWritingContract && (
                <p>Sending transaction...</p>
              )}
              {isTransactionSuccess && (
                <p>Transaction sent, verifying your Twitter account on smart-contract..</p>
              )}
            </div>
          </Modal>
        )}

        {verificationStatus === 'success' && (
          <Modal>
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