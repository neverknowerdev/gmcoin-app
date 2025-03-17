import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/src/config";

// Секретный ключ Infura хранится только на сервере
const INFURA_API_KEY = process.env.INFURA_API_KEY;
if (!CONTRACT_ADDRESS || !CONTRACT_ABI) {
  console.error(
    "Ошибка: CONTRACT_ADDRESS или CONTRACT_ABI не определены в конфигурации"
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

    // Используем обычный JsonRpcProvider вместо WebSocketProvider для большей стабильности
    const provider = new ethers.JsonRpcProvider(
      `https://base-sepolia.infura.io/v3/${INFURA_API_KEY}`
    );

    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      provider
    );

    try {
      // Получаем последние события
      const filter = contract.filters.TwitterVerificationResult();
      const events = await contract.queryFilter(filter, -10000);

      // Ищем событие для указанного адреса кошелька
      for (const event of events) {
        // Правильно обрабатываем событие, проверяя, является ли оно EventLog
        if ("args" in event && event.args) {
          // Проверяем, что args существует и имеет нужную структуру
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
          // Для обычных логов пытаемся декодировать данные
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

      // Если событие не найдено
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
