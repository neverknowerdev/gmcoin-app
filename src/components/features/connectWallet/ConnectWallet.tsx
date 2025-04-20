// ConnectWallet.tsx
import React from "react";
import styles from "./ConnectWallet.module.css";
import { ConnectButton } from "thirdweb/react";
import { client, wallets } from "@/src/config/thirdweb";

interface AuthComponentProps {
  onConnect?: () => void;
  createAmbireWallet?: () => void;
}

const ConnectWallet: React.FC<AuthComponentProps> = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.airship}>
          <img src="/image/wallet/airship.webp" alt="Airship" />
        </div>
      </div>
      <svg
        className={styles.rope}
        width="500"
        height="200"
        viewBox="0 0 500 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M50 50 C150 150, 300 0, 450 150" />
      </svg>
      <div className={styles.body}>
        <div className={styles.buttonContainer}>
          <div className={`${styles.connectButton} ${styles.buttonAnimation}`}>
            <ConnectButton
              client={client}
              wallets={wallets}
            />
          </div>
        </div>
      </div>

      <div className={styles.decorations}>
        <div className={styles.rainbow}>
          <img src="/image/wallet/rainbow.webp" alt="Rainbow" />
        </div>

        <div className={styles.cloud1}>
          <img src="/image/wallet/cloud1.webp" alt="Cloud1" />
        </div>

        <div className={styles.cloud2}>
          <img src="/image/wallet/cloud2.webp" alt="Cloud2" />
        </div>
      </div>
    </div>
  );
};

export default ConnectWallet;
