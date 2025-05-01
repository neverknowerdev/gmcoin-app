import { useState, useMemo, useCallback } from 'react';
import { createThirdwebClient, ThirdwebClient } from 'thirdweb';
import { createWallet, Wallet, WalletId } from 'thirdweb/wallets';

interface UseThirdwebOptions {
  clientId?: string;
}

// Use the client ID from environment variables or a hardcoded value for development
const DEFAULT_CLIENT_ID = process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID || process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || '890548e2d23e55aaffbdc3b2ef96e108';

export function useThirdweb(options?: UseThirdwebOptions) {
  // Use provided clientId or fallback to environment variables or hardcoded value
  const clientId = options?.clientId || DEFAULT_CLIENT_ID;

  const client: ThirdwebClient = useMemo(() => {
    if (!clientId) {
      console.error('No ThirdWeb clientId provided. Using test client ID.');
    }
    
    // Ensure we always have a non-empty string for clientId
    return createThirdwebClient({ 
      clientId: clientId || '890548e2d23e55aaffbdc3b2ef96e108'
    });
  }, [clientId]);

  const [wallet, setWallet] = useState<Wallet | undefined>(undefined);
  const [address, setAddress] = useState<string | undefined>(undefined);

  const connect = useCallback(async () => {
    try {
      const metamask = createWallet('metamask' as WalletId);
      const account = await metamask.connect({ client });
      setWallet(metamask);
      setAddress(account.address);
      return account;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }, [client]);

  const disconnect = useCallback(async () => {
    if (wallet) {
      try {
        await wallet.disconnect();
        setWallet(undefined);
        setAddress(undefined);
      } catch (error) {
        console.error('Error disconnecting wallet:', error);
      }
    }
  }, [wallet]);

  return {
    client,
    wallet,
    address,
    connect,
    disconnect,
  };
}
