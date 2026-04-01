/**
 * get_transcript — Fetches the subtitle/transcript text of a YouTube video.
 * No API key required.
 */

import { fetchYoutubeTranscript } from "../utils/transcript.js";
import { extractVideoId, formatTimestamp } from "../utils/helpers.js";

export async function getTranscript(videoUrl: string): Promise<string> {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    throw new Error(`Invalid YouTube URL or video ID: ${videoUrl}`);
  }

  const segments = await fetchYoutubeTranscript(videoId);

  if (!segments || segments.length === 0) {
    throw new Error(
      `No transcript found for this video. The video might not have subtitles: ${videoId}`
    );
  }

  const lines = segments.map((seg) => {
    const timestamp = formatTimestamp(seg.offset / 1000);
    return `[${timestamp}] ${seg.text}`;
  });

  return [
    `📄 Transcript — Video ID: ${videoId}`,
    `📊 Total ${segments.length} segments`,
    `─────────────────────────────`,
    ...lines,
  ].join("\n");
}
