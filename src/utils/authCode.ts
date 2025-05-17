export function generateAuthCode(walletAddress: string): string {
  if (walletAddress == "") {
    throw new Error("Wallet address is required");
  }

  // Pick a random starting index for the 5-letter wallet substring
  const min = 2;
  const max = walletAddress.length - 10;
  const walletStartingLetterNumber = Math.floor(Math.random() * (max - min + 1)) + min;
  const walletStartingLetterNumberStr = walletStartingLetterNumber.toString().padStart(2, '0');

  // Get 5 letters from the random starting index and convert to uppercase
  const wallet10Letters = walletAddress.slice(walletStartingLetterNumber, walletStartingLetterNumber + 10).toUpperCase();

  // Generate random 5 characters (letters and numbers)
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; // Only uppercase letters and numbers
  let random2 = '';
  for (let i = 0; i < 2; i++) {
    random2 += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  // Combine according to the algorithm: GM + walletStartingLetterNumber + two-digit walletStartingLetterNumber + random2
  return `GM${walletStartingLetterNumberStr}${wallet10Letters}${random2}`;
} 