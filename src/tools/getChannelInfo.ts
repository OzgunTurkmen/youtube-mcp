/**
 * get_channel_info — Fetches YouTube channel information.
 * Requires YouTube Data API v3.
 */

import { extractVideoId } from "../utils/helpers.js";
import { fetchVideoInfo, fetchChannelInfo } from "../utils/youtube.js";

/**
 * Fetches channel details. Provide channelId or videoUrl.
 * If videoUrl is provided, it first extracts the channelId from the video.
 */
export async function getChannelInfo(input: string): Promise<string> {
  let channelId = input.trim();

  // If the parameter is a YouTube video URL, first fetch the video details to get the channelId
  const videoId = extractVideoId(input);
  if (videoId) {
    const videoInfo = await fetchVideoInfo(videoId);
    channelId = videoInfo.channelId;
  }

  // Channel ID validation (Starts with UC, 24 characters)
  if (!channelId.startsWith("UC") && !videoId) {
    throw new Error(
      `Invalid channel ID: ${channelId}. Channel ID must start with "UC" or provide a valid YouTube video URL.`
    );
  }

  const channel = await fetchChannelInfo(channelId);

  return [
    `📺 ${channel.title}`,
    `─────────────────────────────`,
    `👥 Subscribers: ${Number(channel.subscriberCount).toLocaleString("en-US")}`,
    `🎬 Total Videos: ${Number(channel.videoCount).toLocaleString("en-US")}`,
    `👁️ Total Views: ${Number(channel.viewCount).toLocaleString("en-US")}`,
    `📅 Joined: ${new Date(channel.publishedAt).toLocaleDateString("en-US")}`,
    `🌍 Country: ${channel.country}`,
    `🖼️ Avatar: ${channel.thumbnailUrl}`,
    ``,
    `📝 Description:`,
    channel.description || "(No description)",
  ].join("\n");
}
