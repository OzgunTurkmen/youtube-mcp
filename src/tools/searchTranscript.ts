/**
 * search_in_transcript — Searches for a word/phrase in the transcript and returns matching segments.
 * No API key required.
 */

import { fetchYoutubeTranscript } from "../utils/transcript.js";
import { extractVideoId, formatTimestamp, buildTimestampLink } from "../utils/helpers.js";
import type { TranscriptSearchResult } from "../types/index.js";

export async function searchInTranscript(
  videoUrl: string,
  query: string
): Promise<string> {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    throw new Error(`Invalid YouTube URL or video ID: ${videoUrl}`);
  }

  if (!query || query.trim().length === 0) {
    throw new Error("Search query cannot be empty.");
  }

  const segments = await fetchYoutubeTranscript(videoId);
  if (!segments || segments.length === 0) {
    throw new Error(`No transcript found for this video: ${videoId}`);
  }

  const lowerQuery = query.toLowerCase();
  const results: TranscriptSearchResult[] = [];

  for (const seg of segments) {
    if (seg.text.toLowerCase().includes(lowerQuery)) {
      const offsetSec = seg.offset / 1000;
      results.push({
        text: seg.text,
        timestamp: formatTimestamp(offsetSec),
        offsetSeconds: offsetSec,
        youtubeLink: buildTimestampLink(videoId, offsetSec),
      });
    }
  }

  if (results.length === 0) {
    return `🔍 Phrase "${query}" not found in the transcript.`;
  }

  const lines = results.map((r, i) =>
    `${i + 1}. [${r.timestamp}] ${r.text}\n   🔗 ${r.youtubeLink}`
  );

  return [
    `🔍 Search for "${query}" — ${results.length} results`,
    `Video: ${videoId}`,
    `─────────────────────────────`,
    ...lines,
  ].join("\n");
}
