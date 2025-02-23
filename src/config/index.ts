export const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";
export const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID || "";
export const CONTRACT_ABI = [
  "function requestTwitterVerification(string calldata accessCodeEncrypted, string calldata userID) public",
  "function userByWallet(address wallet) public view returns (string memory)",
  "event TwitterVerificationResult(string indexed userID, address indexed wallet, bool isSuccess, string errorMsg)",
];
export const  API_URL = process.env.API_URL || ""; //mainnet
export const TOKEN_URL= process.env.TOKEN_URL || "";

export const CHAINS = [
  {
    id: "0x2105",
    token: "ETH",
    label: "Base",
    rpcUrl: "https://mainnet.base.org",
  },
];