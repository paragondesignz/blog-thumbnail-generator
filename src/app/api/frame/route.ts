import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(":").map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

export async function POST(request: NextRequest) {
  const tempDir = os.tmpdir();
  const videoPath = path.join(tempDir, `video-${Date.now()}.mp4`);
  const framePath = path.join(tempDir, `frame-${Date.now()}.jpg`);

  try {
    const { videoId, timestamp } = await request.json();

    if (!videoId) {
      return NextResponse.json({ error: "Video ID is required" }, { status: 400 });
    }

    const seconds = parseTimestamp(timestamp || "0:00");
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Download a small portion of the video using yt-dlp
    try {
      // First, get the direct video URL
      const { stdout: formatInfo } = await execAsync(
        `yt-dlp -f "best[height<=720]" --get-url "${videoUrl}"`,
        { timeout: 30000 }
      );
      const directUrl = formatInfo.trim().split("\n")[0];

      // Extract frame using ffmpeg
      await execAsync(
        `ffmpeg -ss ${seconds} -i "${directUrl}" -vframes 1 -q:v 2 "${framePath}"`,
        { timeout: 60000 }
      );
    } catch (dlError) {
      console.error("yt-dlp/ffmpeg error:", dlError);
      // Fallback: use YouTube's storyboard/thumbnail at timestamp
      // YouTube provides thumbnails at different timestamps via their API
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

      return NextResponse.json({
        frameData: thumbnailUrl,
        note: "Frame extraction requires yt-dlp and ffmpeg. Using thumbnail as fallback.",
      });
    }

    // Read the extracted frame
    if (!fs.existsSync(framePath)) {
      return NextResponse.json(
        { error: "Failed to extract frame" },
        { status: 500 }
      );
    }

    const frameBuffer = fs.readFileSync(framePath);
    const base64Frame = frameBuffer.toString("base64");

    // Clean up
    try {
      if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      if (fs.existsSync(framePath)) fs.unlinkSync(framePath);
    } catch {
      // Ignore cleanup errors
    }

    return NextResponse.json({
      frameData: `data:image/jpeg;base64,${base64Frame}`,
    });
  } catch (error) {
    console.error("Error extracting frame:", error);

    // Clean up on error
    try {
      if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      if (fs.existsSync(framePath)) fs.unlinkSync(framePath);
    } catch {
      // Ignore cleanup errors
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extract frame" },
      { status: 500 }
    );
  }
}
