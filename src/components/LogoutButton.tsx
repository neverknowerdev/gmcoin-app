"use client";

import { logout } from "../app/actions/auth";
import { useRouter } from "next/navigation";
import { useDisconnect, useActiveWallet } from "thirdweb/react";


export default function LogoutButton() {
  const router = useRouter();
  const { disconnect } = useDisconnect();
  const wallet = useActiveWallet();

  const handleLogout = async () => {
    console.log('handleLogout!', wallet);
    if(wallet) {
      disconnect(wallet); // Disconnect wallet using Thirdweb SDK
    }
    await logout(); // Backend logout
    router.push("/login");
  };

  return (
    <button
      onClick={handleLogout}
      className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
    >
      Logout
    </button>
  );
} 