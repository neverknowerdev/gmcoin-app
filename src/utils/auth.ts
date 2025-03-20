export const generateCodeVerifier = (): string => {
    const array = new Uint32Array(56 / 2);
    window.crypto.getRandomValues(array);
    return Array.from(array, (dec) => ("0" + dec.toString(16)).substr(-2)).join("");
  };
  
  export const base64UrlEncode = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    //@ts-ignore
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  };
  
  export const generateCodeChallenge = async (verifier: string): Promise<string> => {
    try {
      if (!window.crypto || !window.crypto.subtle) {
        console.error("window.crypto.subtle is not available. Possibly insecure context (not HTTPS)");
        const fallbackEncoder = new TextEncoder();
        const fallbackData = fallbackEncoder.encode(verifier);
        return base64UrlEncode(fallbackData.buffer as ArrayBuffer);
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(verifier);
      const digest = await window.crypto.subtle.digest("SHA-256", data);
      return base64UrlEncode(digest);
    } catch (error) {
      console.error("Error generating code challenge:", error);
      // Fallback option in case of error
      const errorEncoder = new TextEncoder();
      const errorData = errorEncoder.encode(verifier);
      return base64UrlEncode(errorData.buffer as ArrayBuffer);
    }
  };