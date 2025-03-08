export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
export const TWITTER_CLIENT_ID = process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID || "";
export const CONTRACT_ABI = [
  "function requestTwitterVerification(string calldata accessCodeEncrypted, string calldata userID) public",
  "function userByWallet(address wallet) public view returns (string memory)",
  "event TwitterVerificationResult(string indexed userID, address indexed wallet, bool isSuccess, string errorMsg)",
];
export const  API_URL = process.env.NEXT_PUBLIC_API_URL || ""; //mainnet
export const TOKEN_URL= process.env.NEXT_PUBLIC_TOKEN_URL || "";

// Update the CHAINS array (around line 9-15)
export const CHAINS = [
  {
    id: 84532,  // Changed from 8453
    token: "ETH",
    label: "Base Sepolia",  // Changed from "Base"
    rpcUrl: "https://sepolia.base.org",  // Changed from "https://mainnet.base.org"
  },
];