import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/src/config';

// Секретный ключ Infura хранится только на сервере
const INFURA_API_KEY = process.env.INFURA_API_KEY || "46c83ef6f9834cc49b76640eededc9f5";

export async function POST(request: Request) {
  try {
    const { walletAddress } = await request.json();
    
    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
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
    
    // Получаем последние события
    const filter = contract.filters.TwitterVerificationResult();
    const events = await contract.queryFilter(filter, -10000);
    
    // Ищем событие для указанного адреса кошелька
    for (const event of events) {
      // Правильно обрабатываем событие, проверяя, является ли оно EventLog
      if ('args' in event) {
        const args = event.args;
        // Проверяем, что args существует и имеет нужную структуру
        if (args && args.length >= 4) {
          const [userID, wallet, isSuccess, errorMsg] = args;
          
          if (wallet.toLowerCase() === walletAddress.toLowerCase()) {
            return NextResponse.json({
              found: true,
              userID,
              wallet,
              isSuccess,
              errorMsg,
              blockNumber: event.blockNumber,
              transactionHash: event.transactionHash,
            });
          }
        }
      } else {
        // Для обычных логов пытаемся декодировать данные
        try {
          const iface = new ethers.Interface(CONTRACT_ABI);
          const decoded = iface.parseLog({
            topics: event.topics,
            data: event.data
          });
          
          if (decoded && decoded.args) {
            const userID = decoded.args[0];
            const wallet = decoded.args[1];
            const isSuccess = decoded.args[2];
            const errorMsg = decoded.args[3];
            
            if (wallet.toLowerCase() === walletAddress.toLowerCase()) {
              return NextResponse.json({
                found: true,
                userID,
                wallet,
                isSuccess,
                errorMsg,
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
    
  } catch (error: any) {
    console.error("Error checking for events:", error);
    return NextResponse.json({
      error: "Internal Server Error",
      message: error.message || "Unknown error",
    }, { status: 500 });
  }
} 