/**
 * summarize_transcript — Splits the transcript into chunks and creates timestamped chapters.
 * No API key required.
 */

import { fetchYoutubeTranscript } from "../utils/transcript.js";
import { extractVideoId, formatTimestamp } from "../utils/helpers.js";
import type { SummaryChapter } from "../types/index.js";

const DEFAULT_CHUNK_SECONDS = 120;

export async function summarizeTranscript(
  videoUrl: string,
  chunkSeconds: number = DEFAULT_CHUNK_SECONDS
): Promise<string> {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    throw new Error(`Invalid YouTube URL or video ID: ${videoUrl}`);
  }

  const segments = await fetchYoutubeTranscript(videoId);
  if (!segments || segments.length === 0) {
    throw new Error(`No transcript found for this video: ${videoId}`);
  }

  const chapters: SummaryChapter[] = [];
  let currentChunkText: string[] = [];
  let chunkStartOffset = 0;
  let lastOffset = 0;

  for (const seg of segments) {
    const offsetSec = seg.offset / 1000;

    if (currentChunkText.length === 0) {
      chunkStartOffset = offsetSec;
    }

    currentChunkText.push(seg.text);
    lastOffset = offsetSec;

    if (offsetSec - chunkStartOffset >= chunkSeconds) {
      const fullText = currentChunkText.join(" ");
      const title = fullText.substring(0, 80).replace(/\s+/g, " ").trim() + "...";

      chapters.push({
        startTime: formatTimestamp(chunkStartOffset),
        endTime: formatTimestamp(offsetSec),
        offsetSeconds: chunkStartOffset,
        title,
        content: fullText,
      });

      currentChunkText = [];
    }
  }

  if (currentChunkText.length > 0) {
    const fullText = currentChunkText.join(" ");
    const title = fullText.substring(0, 80).replace(/\s+/g, " ").trim() + "...";

    chapters.push({
      startTime: formatTimestamp(chunkStartOffset),
      endTime: formatTimestamp(lastOffset),
      offsetSeconds: chunkStartOffset,
      title,
      content: fullText,
    });
  }

  const output = chapters.map((ch, i) => {
    const link = `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(ch.offsetSeconds)}s`;
    return [
      `## Chapter ${i + 1} [${ch.startTime} → ${ch.endTime}]`,
      `🔗 ${link}`,
      `📌 ${ch.title}`,
      ``,
      ch.content,
    ].join("\n");
  });

  return [
    `📝 Video Summary — ${videoId}`,
    `📊 Total ${chapters.length} chapters (~${chunkSeconds} seconds each)`,
    `═══════════════════════════════\n`,
    ...output,
  ].join("\n");
}
