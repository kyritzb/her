import { NextResponse } from "next/server";

// This API route is now optional since we're using ElevenLabs React SDK directly
// It can be used for server-side audio generation if needed

export const POST = async (request: Request) => {
  try {
    const { message } = await request.json();

    // This endpoint can be used for server-side processing if needed
    // For now, we'll just return a success response since the React SDK handles everything

    return NextResponse.json({
      success: true,
      message: "Using ElevenLabs React SDK for real-time conversation",
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "API endpoint error" }, { status: 500 });
  }
};
