import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/src/config";

// Infura secret key is stored only on the server
const INFURA_API_KEY = process.env.INFURA_API_KEY;
if (!CONTRACT_ADDRESS || !CONTRACT_ABI) {
  console.error(
    "Error: CONTRACT_ADDRESS or CONTRACT_ABI are not defined in configuration"
  );
}
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Using regular JsonRpcProvider instead of WebSocketProvider for better stability
    const provider = new ethers.JsonRpcProvider(
      `https://base-sepolia.infura.io/v3/${INFURA_API_KEY}`
    );

    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      provider
    );

    try {
      // Get latest events
      const filter = contract.filters.TwitterVerificationResult();
      const events = await contract.queryFilter(filter, -10000);

      // Search for event with specified wallet address
      for (const event of events) {
        // Properly handle the event by checking if it's an EventLog
        if ("args" in event && event.args) {
          // Check if args exists and has the required structure
          if (Array.isArray(event.args) && event.args.length >= 4) {
            const [userID, wallet, isSuccess, errorMsg] = event.args;

            if (
              wallet &&
              wallet.toLowerCase() === walletAddress.toLowerCase()
            ) {
              return NextResponse.json({
                found: true,
                userID: userID || "unknown",
                wallet,
                isSuccess: !!isSuccess,
                errorMsg: errorMsg || "",
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash,
              });
            }
          }
        } else if (event.topics && event.topics.length >= 2) {
          // For regular logs, try to decode the data
          try {
            const iface = new ethers.Interface(CONTRACT_ABI);
            const decoded = iface.parseLog({
              topics: event.topics,
              data: event.data,
            });

            if (decoded && decoded.args) {
              const userID = decoded.args[0];
              const wallet = decoded.args[1];
              const isSuccess = decoded.args[2];
              const errorMsg = decoded.args[3];

              if (
                wallet &&
                wallet.toLowerCase() === walletAddress.toLowerCase()
              ) {
                return NextResponse.json({
                  found: true,
                  userID: userID || "unknown",
                  wallet,
                  isSuccess: !!isSuccess,
                  errorMsg: errorMsg || "",
                  blockNumber: event.blockNumber,
                  transactionHash: event.transactionHash,
                });
              }
            }
          } catch (decodeError) {
            console.error("Error decoding log:", decodeError);
          }
        }
      }

      // If event is not found
      return NextResponse.json({ found: false });
    } catch (contractError) {
      console.error("Error querying contract events:", contractError);
      return NextResponse.json({
        found: false,
        error: "Error querying contract events",
        message:
          contractError instanceof Error
            ? contractError.message
            : String(contractError),
      });
    }
  } catch (error: any) {
    console.error("Error checking for events:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
