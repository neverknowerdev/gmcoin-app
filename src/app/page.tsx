"use client";

// import { authedOnly } from "./actions/auth";
import LogoutButton from "../components/LogoutButton";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isLoggedIn, logout } from "./actions/auth";
import AccountButton from "../components/AccountButton";
import { baseSepolia, base } from "thirdweb/chains";
import { client } from "../lib/client";
import { useBalance } from 'wagmi';
import { useActiveAccount } from "thirdweb/react";

export default function Dashboard() {
  const router = useRouter();
  const activeAccount = useActiveAccount();
  const gmTokenAddress = process.env.NEXT_PUBLIC_ENV == 'mainnet' ? "0x26f36F365E5EB6483DF4735e40f87E96e15e0007" : "0x19bD68AD19544FFA043B2c3A5064805682783E91";

  const chain = process.env.NEXT_PUBLIC_ENV == 'mainnet' ? base : baseSepolia;

  const { data: balance } = useBalance({
    address: activeAccount?.address as `0x${string}`,
    token: gmTokenAddress as `0x${string}`,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const loggedIn = await isLoggedIn();
      if (!loggedIn) {
        console.log('User is not authorized, redirecting to login...');
        router.push('/login');
      } else {
        console.log('User is authorized');
      }
    };

    checkAuth();
  }, []);

  return (
    <div className="min-h-screen w-ful">
      {/* Top navigation bar with AccountButton */}
      <div className="w-full flex justify-end p-4">
        <AccountButton />
      </div>

      {/* Main content */}
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-24">
        <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
          <h1 className="text-4xl font-bold mb-8 text-center">Dashboard</h1>
          <div className="bg-white/30 p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl mb-4">Welcome!</h2>
            {balance && (
              <div className="mb-4">
                <p className="text-lg">Your GM Balance: {Number(balance.value) / 1e18} {balance.symbol}</p>
              </div>
            )}
            <LogoutButton />
          </div>
        </div>
      </main>
    </div>
  );
} 