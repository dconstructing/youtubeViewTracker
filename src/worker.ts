import { extractVideoId } from './extract-video-id.js';
import { fetchVideoStatistics } from './youtube-stats.js';
import type { VideoStatistics } from './youtube-stats.js';

/**
 * Environment bindings for the Cloudflare Worker.
 * YOUTUBE_API_KEY is provided as a Worker secret (`wrangler secret put`).
 */
export interface Env {
  YOUTUBE_API_KEY: string;
}

interface WorkerResponseBody {
  success: boolean;
  data?: VideoStatistics;
  error?: string;
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

// YouTube video IDs are always 11 URL-safe base64 characters.
const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

function jsonResponse(body: WorkerResponseBody, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

/**
 * Resolve the target video ID from the request. Accepts, in priority order:
 *   - `videoId` query parameter
 *   - `url` query parameter (a YouTube URL to extract from)
 *   - JSON body `{ videoId }` or `{ url }` on POST requests
 */
async function resolveVideoId(request: Request): Promise<string | null> {
  const requestUrl = new URL(request.url);
  const queryVideoId = requestUrl.searchParams.get('videoId');
  const queryUrl = requestUrl.searchParams.get('url');

  if (queryVideoId) {
    return queryVideoId;
  }
  if (queryUrl) {
    return extractVideoId(queryUrl);
  }

  if (request.method === 'POST') {
    try {
      const body = (await request.json()) as {
        url?: string;
        videoId?: string;
      };
      if (body.videoId) {
        return body.videoId;
      }
      if (body.url) {
        return extractVideoId(body.url);
      }
    } catch (error) {
      console.warn('Failed to parse request body as JSON', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight.
    if (request.method === 'OPTIONS') {
      return new Response('', { status: 200, headers: corsHeaders });
    }

    try {
      if (!env.YOUTUBE_API_KEY) {
        console.error('YOUTUBE_API_KEY environment variable is not configured');
        return jsonResponse(
          {
            success: false,
            error: 'Server misconfiguration: YouTube API key is not set.',
          },
          500
        );
      }

      const videoId = await resolveVideoId(request);

      if (!videoId) {
        return jsonResponse(
          {
            success: false,
            error:
              'Video ID is required. Provide either a videoId or a YouTube URL.',
          },
          400
        );
      }

      if (!VIDEO_ID_PATTERN.test(videoId)) {
        return jsonResponse(
          {
            success: false,
            error: 'Invalid video ID format. Must be 11 characters long.',
          },
          400
        );
      }

      const statistics = await fetchVideoStatistics(
        videoId,
        env.YOUTUBE_API_KEY
      );

      return jsonResponse({ success: true, data: statistics }, 200);
    } catch (error) {
      console.error('Worker request failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      return jsonResponse(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred',
        },
        500
      );
    }
  },
};
