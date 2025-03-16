import { FC } from "react";
import styles from "./UserInfo.module.css";
import { formatAddress } from "@/src/utils/formatters";
import { useTokenBalance } from "@/src/hooks/useTokenBalance";

interface UserInfoProps {
  twitterName: string;
  walletAddress: string;
  onDisconnect: () => void;
  signer: any;
}

const DisconnectIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 3H6a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h4" />
    <path d="M18 8l4 4-4 4" />
    <path d="M22 12H10" />
  </svg>
);

const RefreshIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.9 3.2L21 9" />
    <path d="M21 3v6h-6" />
    <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.9-3.2L3 15" />
    <path d="M3 21v-6h6" />
  </svg>
);

export const UserInfo: FC<UserInfoProps> = ({
  twitterName,
  walletAddress,
  onDisconnect,
  signer,
}) => {
  const { balance, isLoading, refreshBalance } = useTokenBalance(
    walletAddress,
    signer
  );

  return (
    <div className={styles.infoContainer}>
      <div className={styles.cosmoman}>
        <img src="/cosmoman.png" alt="Cosmoman" />
      </div>

      <div className={styles.cloude}>
        <p className={styles.username}>{twitterName}</p>
        <div className={styles.addressContainer}>
          <p>{formatAddress(walletAddress)}</p>
          <button
            className={`${styles.iconButton} ${styles.disconnectButton}`}
            onClick={onDisconnect}
          >
            <DisconnectIcon />
          </button>
        </div>
        <div className={styles.balanceContainer}>
          <p className={styles.balance}>
            {isLoading ? "Loading..." : balance ? `${balance} GM` : "0 GM"}
          </p>
          <button
            className={`${styles.iconButton} ${styles.refreshButton}`}
            onClick={refreshBalance}
          >
            <RefreshIcon />
          </button>
        </div>
      </div>
    </div>
  );
};
