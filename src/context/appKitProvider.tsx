'use client'

import React, { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { State, WagmiProvider, cookieToInitialState, type Config } from 'wagmi'
import { createAppKit } from '@reown/appkit/react'
import { config, networks, projectId, wagmiAdapter } from '../config/wagmi'
import { base, baseSepolia } from '@reown/appkit/networks'

const queryClient = new QueryClient()

const chain = process.env.NEXT_PUBLIC_ENV === 'mainnet' ? base : baseSepolia;

const metadata = {
    name: 'GM Coin',
    description: 'first tweet&mint meme-coin GM',
    url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    icons: ['https://avatars.githubusercontent.com/u/179229932']
}

// Initialize AppKit outside the component render cycle
if (!projectId) {
    console.error("AppKit Initialization Error: Project ID is missing.")
} else {
    createAppKit({
        adapters: [wagmiAdapter],
        projectId: projectId!,
        networks: networks,
        defaultNetwork: chain,
        metadata,
        // features: {
        //     socials: [
        //         "google",
        //         "x",
        //         "github",
        //         "discord",
        //         "apple",
        //         "facebook",
        //         "farcaster",
        //     ],
        //     email: true, // default to true
        //     emailShowWallets: true, // default to true
        //     analytics: true,
        // },
        enableNetworkSwitch: false,
        enableCoinbase: true,
        featuredWalletIds: [
            "fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa",
        ],
        // siweConfig: siweConfig,
    })
}

export default function AppKitProvider({
    children,
    initialState,
}: {
    children: ReactNode;
    initialState?: State;
}) {
    return (
        <WagmiProvider config={wagmiAdapter.wagmiConfig} initialState={initialState}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </WagmiProvider>
    );
}