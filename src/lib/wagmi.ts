"use client";

import { createConfig, http, webSocket, fallback } from 'wagmi';
import { base, baseSepolia } from 'viem/chains'
import { createStorage } from 'wagmi'

const chains = process.env.NEXT_PUBLIC_ENV === 'mainnet' ? [base] as const : [baseSepolia] as const;

export const config = createConfig({
    chains,
    transports: {
        [base.id]: fallback([
            webSocket(`wss://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`),
            http(`https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`),
            http('https://mainnet.base.org')
        ]),
        [baseSepolia.id]: fallback([
            webSocket(`wss://base-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`),
            http(`https://base-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`),
            http('https://sepolia.base.org')
        ]),
    },
    storage: createStorage({
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    }),
    pollingInterval: 4000,
});