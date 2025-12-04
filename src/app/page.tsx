"use client";

import { useState } from "react";
import Image from "next/image";

interface VideoData {
  videoId: string;
  title: string;
  author: string;
  thumbnailUrl: string;
  transcript: string;
}

interface GeneratedImage {
  imagePrompt: string;
  imageData: string;
  width: number;
  height: number;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [style, setStyle] = useState("modern and professional");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const fetchVideoData = async () => {
    setLoading(true);
    setError("");
    setVideoData(null);
    setGeneratedImage(null);

    try {
      const response = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch video data");
      }

      setVideoData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const generateImage = async () => {
    if (!videoData) return;

    setGenerating(true);
    setError("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: videoData.title,
          transcript: videoData.transcript,
          style,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image");
      }

      setGeneratedImage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;

    const link = document.createElement("a");
    link.href = generatedImage.imageData;
    link.download = `shopify-blog-thumbnail-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-3">
            Shopify Blog Thumbnail Generator
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Generate AI-powered featured images from YouTube videos
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Optimized for Shopify: 1200 x 628 pixels
          </p>
        </div>

        {/* YouTube URL Input */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            YouTube Video URL
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
            <button
              onClick={fetchVideoData}
              disabled={loading || !url}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? "Loading..." : "Fetch Video"}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Video Preview */}
        {videoData && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Video Preview
            </h2>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="relative w-full md:w-80 aspect-video rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0">
                <Image
                  src={videoData.thumbnailUrl}
                  alt={videoData.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-medium text-slate-900 dark:text-white mb-2">
                  {videoData.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  By {videoData.author}
                </p>
                {videoData.transcript && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Transcript available ({videoData.transcript.length} characters)
                  </p>
                )}
                {!videoData.transcript && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    No transcript available - will use title only
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Style Selection & Generate */}
        {videoData && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Image Style
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                "modern and professional",
                "vibrant and colorful",
                "minimalist and clean",
                "tech and futuristic",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    style === s
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="Or enter custom style..."
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition mb-4"
            />
            <button
              onClick={generateImage}
              disabled={generating}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold rounded-lg transition-all text-lg"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Generating Image...
                </span>
              ) : (
                "Generate Featured Image"
              )}
            </button>
          </div>
        )}

        {/* Generated Image */}
        {generatedImage && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Generated Image
              </h2>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {generatedImage.width} x {generatedImage.height}px
              </span>
            </div>
            <div className="relative w-full aspect-[1200/628] rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 mb-4">
              <Image
                src={generatedImage.imageData}
                alt="Generated thumbnail"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="mb-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                <strong>Prompt used:</strong> {generatedImage.imagePrompt}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={downloadImage}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              >
                Download Image
              </button>
              <button
                onClick={generateImage}
                disabled={generating}
                className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
              >
                Regenerate
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
