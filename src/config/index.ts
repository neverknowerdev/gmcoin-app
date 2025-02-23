export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
export const TWITTER_CLIENT_ID = process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID || "";
export const CONTRACT_ABI = [
  "function requestTwitterVerification(string calldata accessCodeEncrypted, string calldata userID) public",
  "function userByWallet(address wallet) public view returns (string memory)",
  "event TwitterVerificationResult(string indexed userID, address indexed wallet, bool isSuccess, string errorMsg)",
];
export const  API_URL = process.env.NEXT_PUBLIC_API_URL || ""; //mainnet
export const TOKEN_URL= process.env.NEXT_PUBLIC_TOKEN_URL || "";

export const CHAINS = [
  {
    id: 8453,
    token: "ETH",
    label: "Base",
    rpcUrl: "https://mainnet.base.org",
  },
];