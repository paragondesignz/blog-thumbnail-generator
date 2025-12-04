import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL" },
        { status: 400 }
      );
    }

    // Fetch video metadata using oEmbed
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const metadataResponse = await fetch(oembedUrl);

    if (!metadataResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch video metadata" },
        { status: 400 }
      );
    }

    const metadata = await metadataResponse.json();

    // Fetch transcript
    let transcript = "";
    try {
      const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
      transcript = transcriptData.map((item) => item.text).join(" ");
    } catch {
      // Transcript might not be available for all videos
      console.log("Transcript not available for this video");
    }

    return NextResponse.json({
      videoId,
      title: metadata.title,
      author: metadata.author_name,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      transcript: transcript.slice(0, 5000), // Limit transcript length
    });
  } catch (error) {
    console.error("Error fetching YouTube data:", error);
    return NextResponse.json(
      { error: "Failed to fetch video data" },
      { status: 500 }
    );
  }
}
