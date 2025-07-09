import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { wagmiContractConfig } from '../../../config/contractAbi';

interface ZealyRequest {
    accounts?: {
        twitter?: {
            id: string;
        };
    };
}

async function isTwitterUserRegistered(twitterUserId: string): Promise<boolean> {
    const chain = process.env.NEXT_PUBLIC_ENV === 'mainnet' ? base : baseSepolia;

    // Use server-side ALCHEMY_API_KEY, fallback to client-side for backwards compatibility
    const alchemyKey = process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

    if (!alchemyKey) {
        throw new Error('Alchemy API key not configured');
    }

    const publicClient = createPublicClient({
        chain,
        transport: http(
            chain.id === base.id
                ? `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`
                : `https://base-sepolia.g.alchemy.com/v2/${alchemyKey}`
        ),
    });

    const result = await publicClient.readContract({
        ...wagmiContractConfig,
        functionName: 'isTwitterUserRegistered',
        args: [twitterUserId],
    });

    return Boolean(result);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        // Validate API Key
        const apiKey = request.headers.get('X-Api-Key');
        if (apiKey !== process.env.ZEALY_API_KEY) {
            return NextResponse.json({ message: 'Invalid API key' }, { status: 401 });
        }

        // Parse request body
        const body: ZealyRequest = await request.json();

        // Extract Twitter user ID
        const twitterUserId = body.accounts?.twitter?.id;
        if (!twitterUserId) {
            return NextResponse.json({ message: 'No Twitter account provided' }, { status: 400 });
        }

        // Check smart contract
        const isRegistered = await isTwitterUserRegistered(twitterUserId);

        if (isRegistered) {
            return NextResponse.json({ message: 'User completed the action' }, { status: 200 });
        } else {
            return NextResponse.json({ message: 'User is not registered on smart contract' }, { status: 400 });
        }

    } catch (error) {
        console.error('Zealy verification error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(): Promise<NextResponse> {
    return NextResponse.json({ message: 'Method not allowed' }, { status: 405 });
} 