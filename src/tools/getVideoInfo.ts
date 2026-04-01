/**
 * get_video_info — Fetches metadata of a YouTube video (title, duration, views, etc.).
 * Requires YouTube Data API v3.
 */

import { extractVideoId } from "../utils/helpers.js";
import { fetchVideoInfo } from "../utils/youtube.js";

export async function getVideoInfo(videoUrl: string): Promise<string> {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    throw new Error(`Invalid YouTube URL or video ID: ${videoUrl}`);
  }

  const info = await fetchVideoInfo(videoId);

  return [
    `🎬 ${info.title}`,
    `─────────────────────────────`,
    `📺 Channel: ${info.channelTitle}`,
    `📅 Published: ${info.publishedAt}`,
    `⏱️ Duration: ${info.duration}`,
    `👁️ Views: ${Number(info.viewCount).toLocaleString("en-US")}`,
    `👍 Likes: ${Number(info.likeCount).toLocaleString("en-US")}`,
    `💬 Comments: ${Number(info.commentCount).toLocaleString("en-US")}`,
    `🏷️ Tags: ${info.tags.length > 0 ? info.tags.join(", ") : "None"}`,
    `🖼️ Thumbnail: ${info.thumbnailUrl}`,
    ``,
    `📝 Description:`,
    info.description,
  ].join("\n");
}
