/** A single transcript segment */
export interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

/** Video metadata */
export interface VideoInfo {
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  duration: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  tags: string[];
  thumbnailUrl: string;
}

/** YouTube comment */
export interface YouTubeComment {
  author: string;
  text: string;
  likeCount: number;
  publishedAt: string;
}

/** Channel information */
export interface ChannelInfo {
  title: string;
  description: string;
  subscriberCount: string;
  videoCount: string;
  viewCount: string;
  publishedAt: string;
  thumbnailUrl: string;
  country: string;
}

/** Transcript search result */
export interface TranscriptSearchResult {
  text: string;
  timestamp: string;
  offsetSeconds: number;
  youtubeLink: string;
}

/** Summary chapter */
export interface SummaryChapter {
  startTime: string;
  endTime: string;
  offsetSeconds: number;
  title: string;
  content: string;
}
