import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const SHOPIFY_IMAGE_WIDTH = 1200;
const SHOPIFY_IMAGE_HEIGHT = 628;

export async function POST(request: NextRequest) {
  try {
    const { title, transcript, style } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const client = new GoogleGenAI({ apiKey });

    // Create a detailed image prompt based on video content
    const imagePrompt = `Create a professional, high-quality blog featured image for the following content:

Topic: ${title}
${transcript ? `Context: ${transcript.slice(0, 1500)}` : ""}

Requirements:
- Style: ${style || "modern, clean, professional"}
- Aspect ratio: 16:9 (horizontal, suitable for ${SHOPIFY_IMAGE_WIDTH}x${SHOPIFY_IMAGE_HEIGHT})
- NO text, words, or letters in the image
- Visually striking and eye-catching for a blog header
- Professional quality, photorealistic or high-quality illustration
- Rich colors and good composition
- Represents the main theme/topic clearly`;

    // Generate image using Gemini 2.5 Flash Image model
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ parts: [{ text: imagePrompt }] }],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    // Find the image part in the response
    let imageData: string | null = null;
    let promptUsed = imagePrompt;

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          promptUsed = part.text;
        }
        if (part.inlineData?.data) {
          imageData = part.inlineData.data;
        }
      }
    }

    if (!imageData) {
      return NextResponse.json(
        { error: "Failed to generate image - no image data in response" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imagePrompt: promptUsed,
      imageData: `data:image/png;base64,${imageData}`,
      width: SHOPIFY_IMAGE_WIDTH,
      height: SHOPIFY_IMAGE_HEIGHT,
    });
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate image" },
      { status: 500 }
    );
  }
}
