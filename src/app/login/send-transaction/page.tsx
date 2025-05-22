"use client";

import { useProfiles, useActiveAccount, useSendAndConfirmTransaction, useContractEvents } from "thirdweb/react";
import { client } from "../../../lib/client";
import { useEffect, useState } from "react";
import AccountButton from "../../../components/AccountButton";
import { base, baseSepolia } from "thirdweb/chains";
import { getContract, prepareContractCall, prepareEvent } from "thirdweb";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import ButtonBackground from "../../../components/ui/buttons/BlueButton";
import BlueButton from "../../../components/ui/buttons/BlueButton";
import Modal from "../../../components/ui/modal/Modal";
import SunLoader from "../../../components/ui/loader/loader";

export default function SendTransaction() {
  const [authCode, setAuthCode] = useState<string | null>(null);
  const [xUsername, setXUsername] = useState<string | null>(null);
  const [xUserID, setXUserID] = useState<string | null>(null);
  const [xTweetID, setXTweetID] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transactionSent, setTransactionSent] = useState(false);


  useEffect(() => {
    const storedAuthCode = localStorage.getItem("authCode");
    const storedXUsername = localStorage.getItem("xUsername");
    const storedXUserID = localStorage.getItem("xUserID");
    const storedXTweetID = localStorage.getItem("xTweetID");
    setAuthCode(storedAuthCode);
    setXUsername(storedXUsername);
    setXUserID(storedXUserID);
    setXTweetID(storedXTweetID);
  }, []);

  const router = useRouter();

  const { data: profiles, isLoading, error } = useProfiles({
    client,
  });
  const account = useActiveAccount();
  const { mutate: sendTransaction, isPending: isSendingTransaction } = useSendAndConfirmTransaction();

  const chain = process.env.NEXT_PUBLIC_ENV === 'mainnet' ? base : baseSepolia;
  const contractAddress = process.env.NEXT_PUBLIC_ENV === 'mainnet'
    ? "0x26f36F365E5EB6483DF4735e40f87E96e15e0007"
    : "0x19bD68AD19544FFA043B2c3A5064805682783E91";

  const contract = getContract({
    address: contractAddress,
    chain: chain,
    client,
  });

  // Prepare the event
  const twitterVerificationEvent = prepareEvent({
    signature: "event TwitterVerificationResult(string userID, address indexed wallet, bool isSuccess, string errorMsg)",
    filters: {
      wallet: account?.address,
    },
  });

  // Listen for the event only if a transaction has been sent
  const { data: events } = useContractEvents({
    contract,
    events: [twitterVerificationEvent],
    enabled: transactionSent,
  });


  // Handle event when received
  useEffect(() => {
    if (events && events.length > 0) {
      const latestEvent = events[events.length - 1];
      // Skip if the wallet address in the event doesn't match our active wallet
      if (latestEvent.args.wallet.toLowerCase() !== account?.address?.toLowerCase()) {
        console.log("Skipping event - wallet address mismatch");
        return;
      }

      if (latestEvent.args.isSuccess) {
        setVerificationStatus('success');
        setErrorMessage(null);
      } else {
        setVerificationStatus('error');
        setErrorMessage(latestEvent.args.errorMsg);
      }
    }
  }, [events, account?.address]);

  if (isLoading) {
    return <div>Loading profiles...</div>;
  }

  if (error) {
    console.error("Error loading profiles:", error);
    return <div>Error loading profiles</div>;
  }

  const xProfile = profiles?.find(profile => profile.type === "x");
  console.log("X Profile:", xProfile);
  console.log("Auth Code:", authCode);
  console.log("Profiles:", profiles);

  const handleReconnectWalletClick = () => {
    router.push('/login');
  };

  const handleSendTransaction = () => {
    if (!account?.address) {
      setVerificationStatus('error');
      setErrorMessage("No wallet address found");
      console.error("No wallet address found");
      return;
    }

    setVerificationStatus('pending');
    setErrorMessage(null);
    setTransactionSent(true);  // Enable event listening

    let transaction;
    if (xProfile && xProfile.details.id) {
      // If we have xProfile, use requestTwitterVerificationThirdweb
      transaction = prepareContractCall({
        contract,
        method: "function requestTwitterVerificationThirdweb(string calldata userID)",
        params: [xProfile.details.id as string],
      });
    } else if (authCode && xUserID && xTweetID) {
      // If we have authCode and xUserID, use requestTwitterVerificationByAuthCode
      transaction = prepareContractCall({
        contract,
        method: "function requestTwitterVerificationByAuthCode(string calldata authCode, string calldata userID, string calldata tweetID)",
        params: [authCode, xUserID, xTweetID],
      });
    } else {
      setVerificationStatus('error');
      setErrorMessage("Neither xProfile nor authCode with xUserID is available");
      console.error("Neither xProfile nor authCode with xUserID is available");
      return;
    }

    // Send the prepared transaction
    sendTransaction(transaction, {
      onSuccess: (result: any) => {
        console.log("Success! Transaction result:", result);
      },
      onError: (error: any) => {
        setVerificationStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
      },
    });
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
                value={formatAddress(account?.address!)}
                className={styles.input}
                readOnly={true}
              />

            </div>
            <label className={styles.label}>TWITTER USERNAME</label>
            <div className={styles.inputGroup}>
              <input
                type="text"
                placeholder="Enter Twitter..."
                value={xProfile?.details.username || xUsername || "Not connected"}
                className={styles.input}
                readOnly={true}
              />

            </div>

            <div className={styles.buttonContainer}>
              <BlueButton onClick={handleSendTransaction}>SEND</BlueButton>
            </div>
          </div>
        </div>

        {verificationStatus === 'pending' && (
          <Modal>

            <div className="flex justify-center items-center">
              <SunLoader />
            </div>
            <div style={{ marginBottom: '50px' }}>
              <p>Transaction is pending...</p>
            </div>
          </Modal>
        )}
      </div>
    </main >
  );
} 