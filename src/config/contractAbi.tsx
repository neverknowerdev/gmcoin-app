import { CONTRACT_ADDRESS } from "./contracts";

export const wagmiContractConfig = {
    address: CONTRACT_ADDRESS,
    abi: [
        {
            type: 'function',
            name: 'balanceOf',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ type: 'uint256' }],
        },
        {
            type: 'function',
            name: 'totalSupply',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ name: 'supply', type: 'uint256' }],
        },
        {
            type: 'function',
            name: 'userByWallet',
            stateMutability: 'view',
            inputs: [{ name: 'wallet', type: 'address' }],
            outputs: [{ name: '', type: 'string' }],
        },
        {
            type: 'function',
            name: 'isTwitterUserRegistered',
            stateMutability: 'view',
            inputs: [{ name: 'userID', type: 'string' }],
            outputs: [{ name: '', type: 'bool' }],
        },
        {
            type: 'function',
            name: 'isWalletRegistered',
            stateMutability: 'view',
            inputs: [{ name: 'wallet', type: 'address' }],
            outputs: [{ name: '', type: 'bool' }],
        },
        {
            type: 'function',
            name: 'isFarcasterUserRegistered',
            stateMutability: 'view',
            inputs: [{ name: 'fid', type: 'string' }],
            outputs: [{ name: '', type: 'bool' }],
        }
    ],
} as const