import type { APIGatewayProxyEvent } from 'aws-lambda';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { handler } from './lambda-handler.js';
import type { VideoStatistics } from './youtube-stats.js';

interface ParsedResponse {
  success: boolean;
  error?: string;
  data?: VideoStatistics;
}

function parseBody(result: { body: string }): ParsedResponse {
  return JSON.parse(result.body) as ParsedResponse;
}

const baseEvent: APIGatewayProxyEvent = {
  body: null,
  headers: {},
  multiValueHeaders: {},
  httpMethod: 'GET',
  isBase64Encoded: false,
  path: '/viewership',
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {} as APIGatewayProxyEvent['requestContext'],
  resource: '/viewership',
};

function makeEvent(
  overrides: Partial<APIGatewayProxyEvent>
): APIGatewayProxyEvent {
  return { ...baseEvent, ...overrides };
}

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
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => response,
  }) as unknown as typeof fetch;
}

const originalFetch = globalThis.fetch;
const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv, YOUTUBE_API_KEY: 'test-api-key' };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = originalEnv;
  vi.restoreAllMocks();
});

describe('lambda handler', () => {
  test('responds to CORS preflight OPTIONS requests', async () => {
    const result = await handler(makeEvent({ httpMethod: 'OPTIONS' }));

    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
    expect(result.headers?.['Access-Control-Allow-Methods']).toBe(
      'GET, POST, OPTIONS'
    );
  });

  test('returns 500 when the API key is not configured', async () => {
    delete process.env.YOUTUBE_API_KEY;
    const result = await handler(
      makeEvent({ queryStringParameters: { videoId: 'dQw4w9WgXcQ' } })
    );
    const body = parseBody(result);

    expect(result.statusCode).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/API key/i);
  });

  test('returns 400 when no video ID or URL is provided', async () => {
    const result = await handler(makeEvent({}));
    const body = parseBody(result);

    expect(result.statusCode).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Video ID is required/);
  });

  test('returns 400 for an invalid video ID format', async () => {
    const result = await handler(
      makeEvent({ queryStringParameters: { videoId: 'too-short' } })
    );
    const body = parseBody(result);

    expect(result.statusCode).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Invalid video ID format/);
  });

  test('returns statistics for a valid video ID via query param', async () => {
    mockFetch(sampleApiResponse);
    const result = await handler(
      makeEvent({ queryStringParameters: { videoId: 'dQw4w9WgXcQ' } })
    );
    const body = parseBody(result);

    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data?.videoId).toBe('dQw4w9WgXcQ');
    expect(body.data?.viewCount).toBe('100');
  });

  test('extracts the video ID from a YouTube URL query param', async () => {
    mockFetch(sampleApiResponse);
    const result = await handler(
      makeEvent({
        queryStringParameters: {
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        },
      })
    );
    const body = parseBody(result);

    expect(result.statusCode).toBe(200);
    expect(body.data?.videoId).toBe('dQw4w9WgXcQ');
  });

  test('reads the video ID from a POST JSON body', async () => {
    mockFetch(sampleApiResponse);
    const result = await handler(
      makeEvent({
        httpMethod: 'POST',
        body: JSON.stringify({ videoId: 'dQw4w9WgXcQ' }),
      })
    );
    const body = parseBody(result);

    expect(result.statusCode).toBe(200);
    expect(body.data?.videoId).toBe('dQw4w9WgXcQ');
  });

  test('reads the video ID from a base64-encoded POST JSON body', async () => {
    mockFetch(sampleApiResponse);
    const payload = JSON.stringify({ videoId: 'dQw4w9WgXcQ' });
    const result = await handler(
      makeEvent({
        httpMethod: 'POST',
        body: Buffer.from(payload).toString('base64'),
        isBase64Encoded: true,
      })
    );
    const body = parseBody(result);

    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data?.videoId).toBe('dQw4w9WgXcQ');
  });

  test('returns 500 when the YouTube API reports no items', async () => {
    mockFetch({ items: [] });
    const result = await handler(
      makeEvent({ queryStringParameters: { videoId: 'dQw4w9WgXcQ' } })
    );
    const body = parseBody(result);

    expect(result.statusCode).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/not found/i);
  });

  test('returns 500 when the YouTube API request fails', async () => {
    mockFetch({}, false, 403);
    const result = await handler(
      makeEvent({ queryStringParameters: { videoId: 'dQw4w9WgXcQ' } })
    );
    const body = parseBody(result);

    expect(result.statusCode).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/YouTube API request failed/);
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
          statistics: { viewCount: '100' },
        },
      ],
    });
    const result = await handler(
      makeEvent({ queryStringParameters: { videoId: 'dQw4w9WgXcQ' } })
    );
    const body = parseBody(result);

    expect(result.statusCode).toBe(200);
    expect(body.data?.viewCount).toBe('100');
    expect(body.data?.likeCount).toBeNull();
    expect(body.data?.commentCount).toBeNull();
  });
});
