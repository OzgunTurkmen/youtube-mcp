/**
 * YouTube Data API v3 helper functions.
 * API key is read from the .env file.
 */

import type { VideoInfo, YouTubeComment, ChannelInfo } from "../types/index.js";

const API_BASE = "https://www.googleapis.com/youtube/v3";

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || key === "YOUR_API_KEY_HERE") {
    throw new Error(
      "YOUTUBE_API_KEY environment variable is not set. " +
      "Please add a valid YouTube Data API v3 key to your .env file."
    );
  }
  return key;
}

/**
 * Fetches video details via YouTube Data API v3.
 */
export async function fetchVideoInfo(videoId: string): Promise<VideoInfo> {
  const apiKey = getApiKey();
  const url = `${API_BASE}/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const items = data.items;

  if (!items || items.length === 0) {
    throw new Error(`Video not found: ${videoId}`);
  }

  const video = items[0];
  const snippet = video.snippet;
  const stats = video.statistics;
  const details = video.contentDetails;

  return {
    title: snippet.title ?? "",
    description: snippet.description ?? "",
    channelTitle: snippet.channelTitle ?? "",
    channelId: snippet.channelId ?? "",
    publishedAt: snippet.publishedAt ?? "",
    duration: details.duration ?? "",
    viewCount: stats.viewCount ?? "0",
    likeCount: stats.likeCount ?? "0",
    commentCount: stats.commentCount ?? "0",
    tags: snippet.tags ?? [],
    thumbnailUrl: snippet.thumbnails?.maxres?.url
      ?? snippet.thumbnails?.high?.url
      ?? snippet.thumbnails?.default?.url
      ?? "",
  };
}

/**
 * Fetches the most popular comments via YouTube Data API v3.
 */
export async function fetchComments(videoId: string, maxResults: number = 20): Promise<YouTubeComment[]> {
  const apiKey = getApiKey();
  const url = `${API_BASE}/commentThreads?part=snippet&videoId=${videoId}&order=relevance&maxResults=${maxResults}&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("Comments are disabled for this video or API access is restricted.");
    }
    throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const items = data.items ?? [];

  return items.map((item: Record<string, unknown>) => {
    const comment = (item as { snippet: { topLevelComment: { snippet: Record<string, unknown> } } }).snippet.topLevelComment.snippet;
    return {
      author: (comment.authorDisplayName as string) ?? "",
      text: (comment.textDisplay as string) ?? "",
      likeCount: (comment.likeCount as number) ?? 0,
      publishedAt: (comment.publishedAt as string) ?? "",
    };
  });
}

/**
 * Fetches channel information via YouTube Data API v3.
 */
export async function fetchChannelInfo(channelId: string): Promise<ChannelInfo> {
  const apiKey = getApiKey();
  const url = `${API_BASE}/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const items = data.items;

  if (!items || items.length === 0) {
    throw new Error(`Channel not found: ${channelId}`);
  }

  const channel = items[0];
  const snippet = channel.snippet;
  const stats = channel.statistics;

  return {
    title: snippet.title ?? "",
    description: snippet.description ?? "",
    subscriberCount: stats.subscriberCount ?? "0",
    videoCount: stats.videoCount ?? "0",
    viewCount: stats.viewCount ?? "0",
    publishedAt: snippet.publishedAt ?? "",
    thumbnailUrl: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.default?.url ?? "",
    country: snippet.country ?? "Unknown",
  };
}
