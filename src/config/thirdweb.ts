import { createThirdwebClient } from "thirdweb";
import { 
  inAppWallet, 
  createWallet 
} from "thirdweb/wallets";

// Create thirdweb client
export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "your-client-id-placeholder",
});

// Define available wallets for connection
export const wallets = [
  // In-app wallet with various auth options
  inAppWallet({
    auth: {
      options: [
        "google",
        "discord",
        "email",
        "x",
        "phone",
      ],
    },
  }),
  // Popular external wallets
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
]; 