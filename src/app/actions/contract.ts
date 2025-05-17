"use server";

import { authedOnly } from "./auth";
import { readContract } from "thirdweb";
import { base, baseSepolia } from "thirdweb/chains";
import { client } from "../../lib/client";

const chain = process.env.NEXT_PUBLIC_ENV === 'mainnet' ? base : baseSepolia;
const contractAddress = process.env.NEXT_PUBLIC_ENV === 'mainnet' 
  ? "0x26f36F365E5EB6483DF4735e40f87E96e15e0007" 
  : "0x19bD68AD19544FFA043B2c3A5064805682783E91";

export async function checkIsWalletRegisteredInSmartContract() {
  try {
    const user = await authedOnly();
    const address = (user as any).address;
    if (!address) return false;

    const result = await readContract({
      contract: {
        client,
        address: contractAddress,
        chain: chain,
        abi: [{
          name: "userByWallet",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "wallet", type: "address" }],
          outputs: [{ name: "", type: "string" }]
        }]
      },
      method: "userByWallet",
      params: [address]
    });

    console.log("result", result);
    return result !== "";
  } catch (error) {
    console.error("Error checking wallet registration:", error);
    return false;
  }
} 