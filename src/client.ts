import { createThirdwebClient } from "thirdweb";

// Use environment variable for client ID or fallback to a default value
const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || 
                process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID || 
                '890548e2d23e55aaffbdc3b2ef96e108'; // Fallback client ID

// Always have a client ID to prevent initialization errors
if (!clientId || clientId === '') {
  console.warn("No ThirdWeb client ID found in environment variables, using default client ID");
}

export const client = createThirdwebClient({
  clientId,
}); 