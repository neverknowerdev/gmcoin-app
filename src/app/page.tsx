"use client";

import { ConnectButton } from "thirdweb/react";
import { client } from "./client";
import { useThirdweb } from "../hooks/useThirdWeb";
import styles from "./dashboard.module.css";
import Image from "next/image";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const { address } = useThirdweb();
  const [username, setUsername] = useState("GM Friend!");
  const [balance, setBalance] = useState("0.00");

  return (
    <main className={styles.container}>
      <div className={styles.infoContainer}>
        {address ? (
          <div className={styles.cloude}>
            <p>{username}</p>
            <p className={styles.balance}>{balance} ETH</p>
          </div>
        ) : (
          <div className={styles.cloude}>
            <p>Connect Wallet</p>
            <p className={styles.balance}>To Get Started</p>
          </div>
        )}
        
        <div className={styles.cosmoman}>
          <Image src="/cosmoman.png" alt="Cosmoman" width={200} height={220} />
        </div>
      </div>

      <div className={styles.cloud1}>
        <Image src="/image/whcloude.png" alt="Cloud 1" width={820} height={240} />
      </div>

      <div className={styles.cloud2}>
        <Image src="/image/whcloude.png" alt="Cloud 2" width={600} height={180} />
      </div>

      <div className={styles.rainbow}>
        <Image src="/image/planepng.png" alt="Airship" width={400} height={200} />
      </div>

      <div className="flex justify-center mt-8">
        <Link href="/connect">
          <button className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
            Connect & Verify
          </button>
        </Link>
      </div>
    </main>
  );
}





