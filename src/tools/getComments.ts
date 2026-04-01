/**
 * get_comments — Fetches the most popular comments of a YouTube video.
 * Requires YouTube Data API v3.
 */

import { extractVideoId } from "../utils/helpers.js";
import { fetchComments } from "../utils/youtube.js";

export async function getComments(
  videoUrl: string,
  maxResults: number = 20
): Promise<string> {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    throw new Error(`Invalid YouTube URL or video ID: ${videoUrl}`);
  }

  const comments = await fetchComments(videoId, maxResults);

  if (comments.length === 0) {
    return `💬 No comments found for this video: ${videoId}`;
  }

  const lines = comments.map((c, i) => {
    const date = new Date(c.publishedAt).toLocaleDateString("en-US");
    return [
      `${i + 1}. 👤 ${c.author} — ${date}`,
      `   👍 ${c.likeCount} likes`,
      `   💬 ${c.text}`,
    ].join("\n");
  });

  return [
    `💬 Comments — Video: ${videoId}`,
    `📊 Showing ${comments.length} comments`,
    `─────────────────────────────`,
    ...lines,
  ].join("\n");
}
