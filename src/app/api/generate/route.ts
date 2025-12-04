import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const SHOPIFY_IMAGE_WIDTH = 1200;
const SHOPIFY_IMAGE_HEIGHT = 628;

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return base64;
}

export async function POST(request: NextRequest) {
  try {
    const { title, transcript, style, sourceImage, mode } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const client = new GoogleGenAI({ apiKey });

    // Prepare content parts based on mode
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    if (mode === "enhance" && sourceImage) {
      // Enhancement mode: use source image as base
      let imageBase64: string;
      let mimeType = "image/jpeg";

      if (sourceImage.startsWith("data:")) {
        // Already base64
        const matches = sourceImage.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          imageBase64 = matches[2];
        } else {
          throw new Error("Invalid base64 image format");
        }
      } else {
        // URL - fetch and convert
        imageBase64 = await fetchImageAsBase64(sourceImage);
      }

      // Add the source image
      parts.push({
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      });

      // Add enhancement prompt
      parts.push({
        text: `Transform this image into a professional Shopify blog featured image.

Topic context: ${title}
${transcript ? `Content context: ${transcript.slice(0, 1000)}` : ""}

Enhancement requirements:
- Apply a ${style || "modern, clean, professional"} style
- Optimize for blog header format (16:9 aspect ratio, ${SHOPIFY_IMAGE_WIDTH}x${SHOPIFY_IMAGE_HEIGHT})
- Enhance colors, contrast, and visual appeal
- Make it more eye-catching and professional
- Keep the main subject/content from the original
- DO NOT add any text, words, or letters
- Create a polished, high-quality result suitable for a professional blog`,
      });
    } else {
      // Generation mode: create from scratch
      parts.push({
        text: `Create a professional, high-quality blog featured image for the following content:

Topic: ${title}
${transcript ? `Context: ${transcript.slice(0, 1500)}` : ""}

Requirements:
- Style: ${style || "modern, clean, professional"}
- Aspect ratio: 16:9 (horizontal, suitable for ${SHOPIFY_IMAGE_WIDTH}x${SHOPIFY_IMAGE_HEIGHT})
- NO text, words, or letters in the image
- Visually striking and eye-catching for a blog header
- Professional quality, photorealistic or high-quality illustration
- Rich colors and good composition
- Represents the main theme/topic clearly`,
      });
    }

    // Generate/enhance image using Gemini 2.5 Flash Image model
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ parts }],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    // Find the image part in the response
    let imageData: string | null = null;
    let promptUsed = mode === "enhance" ? "Enhanced from source image" : "AI generated";

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
