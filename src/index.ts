#!/usr/bin/env node

/**
 * YouTube MCP Server
 * ─────────────────────
 * A Model Context Protocol (MCP) server for extracting transcripts,
 * metadata, comments, and channel info from YouTube videos.
 */

import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Tools
import { getTranscript } from "./tools/getTranscript.js";
import { getVideoInfo } from "./tools/getVideoInfo.js";
import { summarizeTranscript } from "./tools/summarize.js";
import { searchInTranscript } from "./tools/searchTranscript.js";
import { getComments } from "./tools/getComments.js";
import { getChannelInfo } from "./tools/getChannelInfo.js";

// ─── Create MCP Server ───────────────────────────────────────────

const server = new Server(
  { name: "youtube-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ─── Tool Definitions ─────────────────────────────────────────────────

const TOOLS = [
  {
    name: "get_transcript",
    description:
      "Fetches the transcript (subtitles) of a YouTube video with timestamps. No API key required.",
    inputSchema: {
      type: "object" as const,
      properties: {
        videoUrl: {
          type: "string",
          description: "YouTube video URL or video ID (e.g. https://youtube.com/watch?v=xxx or dQw4w9WgXcQ)",
        },
      },
      required: ["videoUrl"],
    },
  },
  {
    name: "get_video_info",
    description:
      "Fetches metadata for a YouTube video: title, description, duration, views, likes, tags, etc. Requires YouTube API key.",
    inputSchema: {
      type: "object" as const,
      properties: {
        videoUrl: {
          type: "string",
          description: "YouTube video URL or video ID",
        },
      },
      required: ["videoUrl"],
    },
  },
  {
    name: "summarize_transcript",
    description:
      "Splits the YouTube video transcript into chunks and creates timestamped chapters. No API key required.",
    inputSchema: {
      type: "object" as const,
      properties: {
        videoUrl: {
          type: "string",
          description: "YouTube video URL or video ID",
        },
        chunkSeconds: {
          type: "number",
          description: "Duration of each chapter/chunk in seconds. Default: 120",
        },
      },
      required: ["videoUrl"],
    },
  },
  {
    name: "search_in_transcript",
    description:
      "Searches for a word or phrase within a YouTube video transcript. Returns matching segments with timestamps and YouTube URL links. No API key required.",
    inputSchema: {
      type: "object" as const,
      properties: {
        videoUrl: {
          type: "string",
          description: "YouTube video URL or video ID",
        },
        query: {
          type: "string",
          description: "Word or phrase to search for in the transcript",
        },
      },
      required: ["videoUrl", "query"],
    },
  },
  {
    name: "get_comments",
    description:
      "Fetches the most popular comments of a YouTube video. Requires YouTube API key.",
    inputSchema: {
      type: "object" as const,
      properties: {
        videoUrl: {
          type: "string",
          description: "YouTube video URL or video ID",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of comments to fetch. Default: 20",
        },
      },
      required: ["videoUrl"],
    },
  },
  {
    name: "get_channel_info",
    description:
      "Fetches YouTube channel details: name, subscriber count, total videos, total views, etc. You can provide a channel ID or a video URL. Requires YouTube API key.",
    inputSchema: {
      type: "object" as const,
      properties: {
        input: {
          type: "string",
          description: "YouTube channel ID (starts with UC) or a video URL (channel will be auto-extracted from video)",
        },
      },
      required: ["input"],
    },
  },
];

// ─── List Tools Handler ───────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// ─── Call Tool Handler ────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: string;

    switch (name) {
      case "get_transcript": {
        const parsed = z.object({ videoUrl: z.string() }).parse(args);
        result = await getTranscript(parsed.videoUrl);
        break;
      }
      case "get_video_info": {
        const parsed = z.object({ videoUrl: z.string() }).parse(args);
        result = await getVideoInfo(parsed.videoUrl);
        break;
      }
      case "summarize_transcript": {
        const parsed = z
          .object({ videoUrl: z.string(), chunkSeconds: z.number().optional() })
          .parse(args);
        result = await summarizeTranscript(parsed.videoUrl, parsed.chunkSeconds);
        break;
      }
      case "search_in_transcript": {
        const parsed = z
          .object({ videoUrl: z.string(), query: z.string() })
          .parse(args);
        result = await searchInTranscript(parsed.videoUrl, parsed.query);
        break;
      }
      case "get_comments": {
        const parsed = z
          .object({ videoUrl: z.string(), maxResults: z.number().optional() })
          .parse(args);
        result = await getComments(parsed.videoUrl, parsed.maxResults);
        break;
      }
      case "get_channel_info": {
        const parsed = z.object({ input: z.string() }).parse(args);
        result = await getChannelInfo(parsed.input);
        break;
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `❌ Error: ${message}` }],
      isError: true,
    };
  }
});

// ─── Express App Configuration (For Vercel / SSE) ────────────────

export const app = express();
let transport: SSEServerTransport;

app.get("/sse", async (req, res) => {
  transport = new SSEServerTransport("/message", res);
  await server.connect(transport);
});

app.post("/message", async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(503).send("SSE connection not established");
  }
});

app.get("/", (req, res) => {
  res.send("YouTube MCP Server is running. Endpoint: /sse");
});

// ─── Start Server ────────────────────────────────────────────────

const isVercel = process.env.VERCEL === "1" || process.env.VERCEL_ENV !== undefined;

if (!isVercel) {
  // Local CLI Mode
  console.error("🖥️ Starting YouTube MCP Server in local mode (stdio transport)");
  const stdioTransport = new StdioServerTransport();
  server.connect(stdioTransport).catch((error) => {
    console.error("❌ Server start error:", error);
    process.exit(1);
  });
}

export default app;
