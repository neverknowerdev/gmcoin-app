export interface FarcasterUser {
  fid: number;
  address: string;
}

export interface FarcasterPrimaryAddressResponse {
  result: {
    address: {
      fid: number;
      protocol: string;
      address: string;
    }
  }
}

export const fetchFarcasterPrimaryAddress = async (fid: string): Promise<string | null> => {
  try {
    const response = await fetch(`https://api.farcaster.xyz/fc/primary-address?fid=${fid}&protocol=ethereum`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch primary address: ${response.status}`);
    }
    
    const data: FarcasterPrimaryAddressResponse = await response.json();
    return data.result?.address?.address || null;
  } catch (error) {
    console.error('Error fetching Farcaster primary address:', error);
    return null;
  }
};

export const extractFidFromReownSocial = (): string | null => {
  try {
    // Check localStorage for Reown social login data
    const socialData = localStorage.getItem('w3m-social');
    if (!socialData) return null;
    
    const parsed = JSON.parse(socialData);
    
    // Look for Farcaster FID in various possible locations
    if (parsed.farcaster?.fid) {
      return parsed.farcaster.fid.toString();
    }
    
    if (parsed.user?.fid) {
      return parsed.user.fid.toString();
    }
    
    if (parsed.fid) {
      return parsed.fid.toString();
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting FID from Reown social data:', error);
    return null;
  }
};