import React from 'react';
import styles from './DashboardDecorations.module.css';

export const DashboardDecorations = () => {
  return (
    <div className={styles.decorations}>
      <div className={styles.rainbow}>
        <img src="/image/wallet/rainbow.png" alt="Rainbow" />
      </div>
      <div className={styles.cloud1}>
        <img src="/image/wallet/cloud1.png" alt="Cloud1" />
      </div>
      <div className={styles.cloud2}>
        <img src="/image/wallet/cloud2.png" alt="Cloud2" />
      </div>
    </div>
  );
}; 