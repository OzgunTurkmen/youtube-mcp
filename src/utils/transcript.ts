/**
 * YouTube transcript fetcher — an independent module to fetch YouTube transcripts
 * without any external npm dependency issues.
 * Requires no API key.
 */

export interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
  lang?: string;
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)";

const INNERTUBE_URL = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
const ANDROID_UA = "com.google.android.youtube/20.10.38 (Linux; U; Android 14)";
const ANDROID_CONTEXT = {
  client: { clientName: "ANDROID", clientVersion: "20.10.38" },
};

/**
 * Fetches the transcript of a YouTube video.
 * Tries the InnerTube API first, falls back to web page scraping if it fails.
 */
export async function fetchYoutubeTranscript(
  videoId: string,
  lang?: string
): Promise<TranscriptSegment[]> {
  // Method 1: InnerTube API (Android client)
  const innerTubeResult = await fetchViaInnerTube(videoId, lang);
  if (innerTubeResult && innerTubeResult.length > 0) {
    return innerTubeResult;
  }

  // Method 2: Web page scraping
  return fetchViaWebPage(videoId, lang);
}

async function fetchViaInnerTube(
  videoId: string,
  lang?: string
): Promise<TranscriptSegment[] | null> {
  try {
    const response = await fetch(INNERTUBE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": ANDROID_UA,
      },
      body: JSON.stringify({
        context: ANDROID_CONTEXT,
        videoId,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const tracks =
      data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!Array.isArray(tracks) || tracks.length === 0) return null;

    return fetchTranscriptFromTracks(tracks, videoId, lang);
  } catch {
    return null;
  }
}

async function fetchViaWebPage(
  videoId: string,
  lang?: string
): Promise<TranscriptSegment[]> {
  const headers: Record<string, string> = { "User-Agent": USER_AGENT };
  if (lang) headers["Accept-Language"] = lang;

  const response = await fetch(
    `https://www.youtube.com/watch?v=${videoId}`,
    { headers }
  );
  const html = await response.text();

  if (html.includes('class="g-recaptcha"')) {
    throw new Error(
      "YouTube is demanding a CAPTCHA verification due to too many requests. Please try again later."
    );
  }

  if (!html.includes('"playabilityStatus":')) {
    throw new Error(`The video is no longer available: ${videoId}`);
  }

  // eslint-disable-next-line -- response structure is dynamic, cannot ensure type safety
  const playerResponse = parseInlineJson(html, "ytInitialPlayerResponse") as Record<string, Record<string, Record<string, unknown>>>;
  const tracks =
    (playerResponse?.captions?.playerCaptionsTracklistRenderer as Record<string, unknown>)?.captionTracks as Array<{ languageCode: string; baseUrl: string }> | undefined;

  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new Error(`Transcript is not available for this video: ${videoId}`);
  }

  return fetchTranscriptFromTracks(tracks, videoId, lang);
}

function parseInlineJson(
  html: string,
  varName: string
): Record<string, unknown> | null {
  const prefix = `var ${varName} = `;
  const startIdx = html.indexOf(prefix);
  if (startIdx === -1) return null;

  const jsonStart = startIdx + prefix.length;
  let depth = 0;

  for (let i = jsonStart; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(jsonStart, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

async function fetchTranscriptFromTracks(
  tracks: Array<{ languageCode: string; baseUrl: string }>,
  videoId: string,
  lang?: string
): Promise<TranscriptSegment[]> {
  if (lang && !tracks.some((t) => t.languageCode === lang)) {
    const available = tracks.map((t) => t.languageCode).join(", ");
    throw new Error(
      `No transcript available in "${lang}" language (video: ${videoId}). Available languages: ${available}`
    );
  }

  const track = lang
    ? tracks.find((t) => t.languageCode === lang)!
    : tracks[0];

  const trackUrl = track.baseUrl;
  try {
    if (!new URL(trackUrl).hostname.endsWith(".youtube.com")) {
      throw new Error(`Transcript is not available: ${videoId}`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("Transcript")) throw err;
    throw new Error(`Transcript is not available: ${videoId}`);
  }

  const response = await fetch(trackUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      ...(lang && { "Accept-Language": lang }),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch transcript data: ${videoId}`);
  }

  const xml = await response.text();
  const usedLang = lang ?? track.languageCode;
  return parseTranscriptXml(xml, usedLang);
}

function parseTranscriptXml(
  xml: string,
  lang: string
): TranscriptSegment[] {
  // New srv3 format: <p t="ms" d="ms">...</p>
  const srv3Regex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  const segments: TranscriptSegment[] = [];
  let match: RegExpExecArray | null;

  while ((match = srv3Regex.exec(xml)) !== null) {
    const offset = parseInt(match[1], 10);
    const duration = parseInt(match[2], 10);
    const rawContent = match[3];

    // Extract text from <s> tags
    let text = "";
    const sRegex = /<s[^>]*>([^<]*)<\/s>/g;
    let sMatch: RegExpExecArray | null;
    while ((sMatch = sRegex.exec(rawContent)) !== null) {
      text += sMatch[1];
    }
    if (!text) {
      text = rawContent.replace(/<[^>]+>/g, "");
    }
    text = decodeEntities(text).trim();

    if (text) {
      segments.push({ text, offset, duration, lang });
    }
  }

  // If there's no srv3 format, try the old format: <text start="s" dur="s">...</text>
  if (segments.length === 0) {
    const classicRegex = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;
    while ((match = classicRegex.exec(xml)) !== null) {
      segments.push({
        text: decodeEntities(match[3]),
        offset: parseFloat(match[1]) * 1000, // seconds -> milliseconds
        duration: parseFloat(match[2]) * 1000,
        lang,
      });
    }
  }

  return segments;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCodePoint(parseInt(dec, 10))
    );
}
