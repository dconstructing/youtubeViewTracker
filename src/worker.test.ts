import worker, { Env } from './worker.js';
import type { VideoStatistics } from './youtube-stats.js';

interface ParsedResponse {
  success: boolean;
  error?: string;
  data?: VideoStatistics;
}

async function readBody(response: Response): Promise<ParsedResponse> {
  return (await response.json()) as ParsedResponse;
}

const env: Env = { YOUTUBE_API_KEY: 'test-api-key' };

const sampleApiResponse = {
  items: [
    {
      id: 'dQw4w9WgXcQ',
      snippet: {
        title: 'Test Video',
        channelTitle: 'Test Channel',
        publishedAt: '2020-01-01T00:00:00Z',
      },
      statistics: {
        viewCount: '100',
        likeCount: '10',
        commentCount: '5',
      },
    },
  ],
};

function mockFetch(response: unknown, ok = true, status = 200): void {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => response,
  }) as unknown as typeof fetch;
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe('worker fetch handler', () => {
  test('responds to CORS preflight OPTIONS requests', async () => {
    const request = new Request('https://worker.example/viewership', {
      method: 'OPTIONS',
    });

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
      'GET, POST, OPTIONS'
    );
  });

  test('returns 500 when the API key is not configured', async () => {
    const request = new Request(
      'https://worker.example/viewership?videoId=dQw4w9WgXcQ'
    );

    const response = await worker.fetch(request, { YOUTUBE_API_KEY: '' });
    const body = await readBody(response);

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/API key/i);
  });

  test('returns 400 when no video ID or URL is provided', async () => {
    const request = new Request('https://worker.example/viewership');

    const response = await worker.fetch(request, env);
    const body = await readBody(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Video ID is required/);
    // CORS headers must be present on every response, not just OPTIONS, so the
    // browser frontend can read error bodies cross-origin.
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  test('returns 400 for an invalid video ID format', async () => {
    const request = new Request(
      'https://worker.example/viewership?videoId=too-short'
    );

    const response = await worker.fetch(request, env);
    const body = await readBody(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Invalid video ID format/);
  });

  test('returns statistics for a valid video ID via query param', async () => {
    mockFetch(sampleApiResponse);
    const request = new Request(
      'https://worker.example/viewership?videoId=dQw4w9WgXcQ'
    );

    const response = await worker.fetch(request, env);
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data?.videoId).toBe('dQw4w9WgXcQ');
    expect(body.data?.viewCount).toBe('100');
    expect(body.data?.retrievedAt).toBeDefined();
  });

  test('extracts the video ID from a YouTube URL query param', async () => {
    mockFetch(sampleApiResponse);
    const youtubeUrl = encodeURIComponent(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );
    const request = new Request(
      `https://worker.example/viewership?url=${youtubeUrl}`
    );

    const response = await worker.fetch(request, env);
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data?.videoId).toBe('dQw4w9WgXcQ');
  });

  test('reads the video ID from a POST JSON body', async () => {
    mockFetch(sampleApiResponse);
    const request = new Request('https://worker.example/viewership', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: 'dQw4w9WgXcQ' }),
    });

    const response = await worker.fetch(request, env);
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data?.videoId).toBe('dQw4w9WgXcQ');
  });

  test('returns 500 when the YouTube API reports no items', async () => {
    mockFetch({ items: [] });
    const request = new Request(
      'https://worker.example/viewership?videoId=dQw4w9WgXcQ'
    );

    const response = await worker.fetch(request, env);
    const body = await readBody(response);

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/not found/i);
  });

  test('returns 500 when the YouTube API request fails', async () => {
    mockFetch({}, false, 403);
    const request = new Request(
      'https://worker.example/viewership?videoId=dQw4w9WgXcQ'
    );

    const response = await worker.fetch(request, env);
    const body = await readBody(response);

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/YouTube API request failed/);
  });

  test('surfaces the reason from the YouTube error body to the client', async () => {
    mockFetch({ error: { message: 'Daily Limit Exceeded' } }, false, 403);
    const request = new Request(
      'https://worker.example/viewership?videoId=dQw4w9WgXcQ'
    );

    const response = await worker.fetch(request, env);
    const body = await readBody(response);

    expect(response.status).toBe(500);
    expect(body.error).toMatch(/Daily Limit Exceeded/);
  });

  test('passes through null for counts YouTube omits (no false 0)', async () => {
    mockFetch({
      items: [
        {
          id: 'dQw4w9WgXcQ',
          snippet: {
            title: 'Test Video',
            channelTitle: 'Test Channel',
            publishedAt: '2020-01-01T00:00:00Z',
          },
          // Likes hidden and comments disabled: YouTube omits those fields.
          statistics: { viewCount: '100' },
        },
      ],
    });
    const request = new Request(
      'https://worker.example/viewership?videoId=dQw4w9WgXcQ'
    );

    const response = await worker.fetch(request, env);
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.data?.viewCount).toBe('100');
    expect(body.data?.likeCount).toBeNull();
    expect(body.data?.commentCount).toBeNull();
  });
});
