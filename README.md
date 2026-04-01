# YouTube MCP Server

A Model Context Protocol (MCP) server for extracting and processing YouTube video content. This server provides tools for LLMs to directly read video transcripts, analyze metadata, search within videos, fetch top comments, and get channel statistics.

## Features

- **Transcript Extraction**: Fetch video subtitles/transcripts with timestamps (No API Key Required).
- **Video Summarization**: Intelligent transcript chunking for LLM summarization.
- **Transcript Search**: Search for specific words or phrases and get exact YouTube timestamp links.
- **Video Metadata**: Fetch views, likes, descriptions, duration, and tags (Requires API Key).
- **Top Comments**: Fetch the most relevant comments of a video.
- **Channel Info**: Get subscriber count, total video count, and channel creation date.

## Prerequisites

- Node.js 18 or higher (v22+ recommended)
- A YouTube Data API v3 Key (Only required for metadata, comments, and channel info)

## Installation

```bash
# 1. Clone or download the repository
# 2. Install dependencies
npm install

# 3. Build the project
npm run build
```

## Configuration

For tools requiring an API key (video info, comments, channel info), you need to get a free API key from Google Cloud Console.

1. Copy the example env file:
   ```bash
   cp .env.example .env
   ```
2. Add your **YouTube Data API v3** key to the `.env` file:
   ```env
   YOUTUBE_API_KEY=YOUR_API_KEY_HERE
   ```

## Development

```bash
# Run in development mode (auto-reload on save)
npm run dev
```

## Adding to Cursor / Claude Desktop

Add the following to your `mcp_config.json` file:

```json
{
  "mcpServers": {
    "youtube-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/youtube-mcp/dist/index.js"],
      "env": {
        "YOUTUBE_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

## Tools List

| Tool Name | Description | Requires API Key |
|---|---|---|
| `get_transcript` | Fetches the full transcript with timestamps | ❌ No |
| `summarize_transcript` | Splits transcript into smaller timestamped chunks | ❌ No |
| `search_in_transcript` | Searches the video text and returns timestamp links | ❌ No |
| `get_video_info` | Fetches views, likes, duration, and description | ✅ Yes |
| `get_comments` | Fetches top comments | ✅ Yes |
| `get_channel_info` | Fetches subscriber count and channel statistics | ✅ Yes |
