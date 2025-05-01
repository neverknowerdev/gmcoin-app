import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, encryptedToken } = body;

    if (!userId) {
      return NextResponse.json({
        username: "Unknown User",
        id: "unknown",
        note: "User ID is required"
      });
    }

    // Create temporary username based on ID
    const tempUsername = `@${userId.substring(0, 8)}`;

    return NextResponse.json({
      username: tempUsername,
      id: userId,
      note: "Temporary username generated"
    });

  } catch (error: any) {
    console.error("Error processing request:", error);
    return NextResponse.json({
      username: "Twitter User",
      id: "unknown",
      error: "Internal Server Error",
      message: error.message || "Unknown error",
    });
  }
}