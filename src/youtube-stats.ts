/**
 * Shared, dependency-free core for fetching YouTube video statistics.
 *
 * This module intentionally imports nothing from Node (no fs/path), so it can
 * be bundled unchanged into the Cloudflare Worker (src/worker.ts), the AWS
 * Lambda handler (src/lambda-handler.ts), and the CLI tracker
 * (src/viewership-tracker.ts). It relies only on the Web-standard `fetch`.
 */

export interface VideoStatistics {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  // null when YouTube does not report the count (e.g. likes hidden, comments
  // disabled). Clients should render null as "Unknown" rather than a false 0.
  viewCount: string | null;
  likeCount: string | null;
  commentCount: string | null;
  retrievedAt: string;
}

export interface YouTubeApiResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      channelTitle: string;
      publishedAt: string;
    };
    // YouTube omits individual count fields when they are unavailable, e.g.
    // likeCount when likes are hidden or commentCount when comments are
    // disabled — so each is optional at runtime.
    statistics: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
  }>;
}

// The error body YouTube returns on a failed request, e.g.
// { "error": { "code": 403, "message": "The request cannot be completed..." } }
interface YouTubeErrorResponse {
  error?: {
    message?: string;
  };
}

/**
 * Best-effort extraction of a human-readable reason from a failed YouTube
 * response body. Never throws — returns an empty string if the body is missing
 * or not the expected JSON shape.
 */
async function readErrorDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as YouTubeErrorResponse;
    return body?.error?.message?.trim() ?? '';
  } catch {
    // Body was absent or not JSON; there is no extra detail to surface.
    return '';
  }
}

/**
 * Fetch and normalize statistics for a single video. Throws on transport
 * errors, non-2xx responses (with the reason YouTube reported), and unknown or
 * inaccessible video IDs.
 */
export async function fetchVideoStatistics(
  videoId: string,
  apiKey: string
): Promise<VideoStatistics> {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    console.error('YouTube API request failed', {
      videoId,
      status: response.status,
      statusText: response.statusText,
      detail: detail || undefined,
    });
    throw new Error(
      `YouTube API request failed: ${response.status} ${response.statusText}` +
        (detail ? ` - ${detail}` : '')
    );
  }

  const data = (await response.json()) as YouTubeApiResponse;

  if (!data.items || data.items.length === 0) {
    console.warn('YouTube video not found or not accessible', { videoId });
    throw new Error(`Video not found or not accessible: ${videoId}`);
  }

  const video = data.items[0];

  return {
    videoId,
    title: video.snippet.title,
    channelTitle: video.snippet.channelTitle,
    publishedAt: video.snippet.publishedAt,
    // Preserve the reported count, or null when YouTube omits it (hidden
    // likes, disabled comments). Rendered as "Unknown" by clients rather than
    // a misleading 0.
    viewCount: video.statistics.viewCount ?? null,
    likeCount: video.statistics.likeCount ?? null,
    commentCount: video.statistics.commentCount ?? null,
    retrievedAt: new Date().toISOString(),
  };
}
