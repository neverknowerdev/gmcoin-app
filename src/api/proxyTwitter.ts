import { TOKEN_URL } from "@/src/config";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const url = TOKEN_URL;

  if (!url) {
    console.error("❌ TOKEN_URL is not defined in .env!");
    return res.status(500).json({ error: "Server configuration error" });
  }

  // Check for required parameters
  const { authCode, verifier, redirectUri } = req.body;

  if (!authCode || !verifier) {
    console.error("❌ Missing required parameters in request");
    return res.status(400).json({
      error: "Missing required parameters",
      details: {
        hasAuthCode: !!authCode,
        hasVerifier: !!verifier,
        hasRedirectUri: !!redirectUri,
      },
    });
  }

  // Check if the request is a duplicate
  const requestId = `${authCode.substring(0, 10)}_${Math.floor(Math.random() * 1000000)}`;
  console.log(`📝 Processing request ${requestId}`);

  // Make sure redirectUri doesn't contain extra parameters
  const cleanRedirectUri = redirectUri
    ? redirectUri.split("?")[0]
    : redirectUri;

  console.log("📤 Sending request to Twitter API:", {
    url,
    bodyLength: JSON.stringify(req.body).length,
    hasAuthCode: !!authCode,
    hasVerifier: !!verifier,
    hasRedirectUri: !!cleanRedirectUri,
    authCodeLength: authCode?.length,
    verifierLength: verifier?.length,
  });

  try {
    // Add random delay to prevent race conditions
    const randomDelay = Math.floor(Math.random() * 100);
    await new Promise((resolve) => setTimeout(resolve, randomDelay));

    // Create modified request body with cleaned redirectUri
    const modifiedBody = {
      ...req.body,
      redirectUri: cleanRedirectUri,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Request-ID": requestId,
        "Cache-Control": "no-cache, no-store",
        Pragma: "no-cache",
      },
      body: JSON.stringify(modifiedBody),
    });

    console.log(`📥 Received response from Twitter API for request ${requestId}:`, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    // Try to get response body as text
    const responseText = await response.text();
    console.log(`📄 Response body for request ${requestId}:`, responseText);

    // Try to parse text to JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(
        `❌ Error parsing JSON for request ${requestId}:`,
        parseError
      );
      return res.status(response.status).json({
        error: "Invalid JSON response from server",
        originalResponse: responseText,
        requestId,
      });
    }

    // Check for error in response
    if (data.error || data.success === false) {
      console.error(`❌ API Error for request ${requestId}:`, data);

      // If error is related to invalid authorization code, return special status
      if (
        data.error?.error === "invalid_request" ||
        (data.error?.error_description &&
          data.error.error_description.includes("authorization code"))
      ) {
        return res.status(400).json({
          ...data,
          message: "Authorization code has already been used or expired",
          requestId,
        });
      }

      return res.status(400).json({
        ...data,
        requestId,
      });
    }

    // Check for required fields in response
    if (!data.username || !data.user_id) {
      console.error(
        `❌ Missing required fields in response for request ${requestId}:`,
        data
      );
      return res.status(400).json({
        error: "Missing required fields in response",
        originalResponse: data,
        requestId,
      });
    }

    console.log(`✅ Successfully processed request ${requestId}`);
    return res.status(response.status).json({
      ...data,
      requestId,
    });
  } catch (error: any) {
    console.error(
      `❌ Proxy error for request ${requestId}:`,
      error.message || error
    );
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Unknown error",
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      requestId,
    });
  }
}
