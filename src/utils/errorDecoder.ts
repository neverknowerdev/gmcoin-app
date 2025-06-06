export function decodeHexError(hexError: string): string {
    // Remove the '0x' prefix if it exists
    const hex = hexError.startsWith('0x') ? hexError.slice(2) : hexError;

    // The first 8 bytes (16 hex characters) are the function selector
    // The next 32 bytes (64 hex characters) are the offset
    // The actual error message starts after that
    const errorMessageHex = hex.slice(136); // Skip the first 136 characters (8 + 32 bytes)

    // Convert hex to string
    let result = '';
    for (let i = 0; i < errorMessageHex.length; i += 2) {
        const byte = parseInt(errorMessageHex.substr(i, 2), 16);
        if (byte === 0) break; // Stop at null terminator
        result += String.fromCharCode(byte);
    }

    return result;
}

// Example usage:
// const hexError = "0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002377616c6c657420616c7265616479206c696e6b656420666f72207468617420757365720000000000000000000000000000000000000000000000000000000000";
// console.log(decodeHexError(hexError)); // Output: "wallet already linked for that user" 