const contractAddress = process.env.NEXT_PUBLIC_ENV === 'mainnet'
    ? "0x26f36F365E5EB6483DF4735e40f87E96e15e0007"
    : "0x19bD68AD19544FFA043B2c3A5064805682783E91";

export const wagmiContractConfig = {
    address: contractAddress,
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
        }
    ],
} as const