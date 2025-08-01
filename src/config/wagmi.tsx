import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { AppKitNetwork, base, baseSepolia } from '@reown/appkit/networks'

// Read Project ID from environment variables
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID

// Ensure Project ID is defined at build time
if (!projectId) {
    throw new Error('NEXT_PUBLIC_PROJECT_ID is not defined. Please set it in .env.local')
}

// Define supported networks
const chain = process.env.NEXT_PUBLIC_ENV === 'mainnet' ? base : baseSepolia;
export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [chain];

// Create the Wagmi adapter instance
export const wagmiAdapter = new WagmiAdapter({
    ssr: true, // Enable SSR support
    projectId,
    networks
})
// Export the Wagmi config generated by the adapter
export const config = wagmiAdapter.wagmiConfig 