export const GM_TOKEN_ADDRESS = {
    mainnet: "0x26f36F365E5EB6483DF4735e40f87E96e15e0007",
    testnet: "0xc5Da77c0C7933Aef5878dF571a4DdC4F3e9090f7"
} as const;

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ENV === 'mainnet'
    ? GM_TOKEN_ADDRESS.mainnet
    : GM_TOKEN_ADDRESS.testnet; 