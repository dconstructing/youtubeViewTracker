import { fetchVideoStatistics } from './youtube-stats.js';

global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

const videoId = 'dQw4w9WgXcQ';
const apiKey = 'test-api-key';

function fullItem(statistics: Record<string, string>) {
  return {
    items: [
      {
        id: videoId,
        snippet: {
          title: 'Test Video',
          channelTitle: 'Test Channel',
          publishedAt: '2023-01-01T00:00:00Z',
        },
        statistics,
      },
    ],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fetchVideoStatistics', () => {
  test('maps all present statistics fields', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        fullItem({ viewCount: '1000', likeCount: '50', commentCount: '5' }),
    } as Response);

    const result = await fetchVideoStatistics(videoId, apiKey);

    expect(result).toMatchObject({
      videoId,
      title: 'Test Video',
      channelTitle: 'Test Channel',
      viewCount: '1000',
      likeCount: '50',
      commentCount: '5',
    });
    expect(mockFetch).toHaveBeenCalledWith(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${apiKey}`
    );
  });

  test('reports omitted counts as null (hidden likes / disabled comments)', async () => {
    // YouTube omits likeCount when likes are hidden and commentCount when
    // comments are disabled; viewCount can likewise be absent. These must be
    // null (rendered as "Unknown"), never a false 0.
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fullItem({}),
    } as Response);

    const result = await fetchVideoStatistics(videoId, apiKey);

    expect(result.viewCount).toBeNull();
    expect(result.likeCount).toBeNull();
    expect(result.commentCount).toBeNull();
  });

  test('keeps a reported zero distinct from an omitted count', async () => {
    // A genuine "0" (e.g. a brand-new video with no likes yet) must be
    // preserved as '0', not collapsed into null/Unknown.
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        fullItem({ viewCount: '0', likeCount: '0', commentCount: '0' }),
    } as Response);

    const result = await fetchVideoStatistics(videoId, apiKey);

    expect(result.viewCount).toBe('0');
    expect(result.likeCount).toBe('0');
    expect(result.commentCount).toBe('0');
  });

  test('includes the reason from the YouTube error body on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({
        error: { message: 'The request cannot be completed: quota exceeded.' },
      }),
    } as Response);

    await expect(fetchVideoStatistics(videoId, apiKey)).rejects.toThrow(
      'YouTube API request failed: 403 Forbidden - The request cannot be completed: quota exceeded.'
    );
  });

  test('falls back to status text when the error body is not JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      // No json() method: readErrorDetail must swallow the failure.
    } as Response);

    await expect(fetchVideoStatistics(videoId, apiKey)).rejects.toThrow(
      'YouTube API request failed: 500 Internal Server Error'
    );
  });

  test('throws when the video is not found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    } as Response);

    await expect(fetchVideoStatistics(videoId, apiKey)).rejects.toThrow(
      `Video not found or not accessible: ${videoId}`
    );
  });

  test('propagates transport errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(fetchVideoStatistics(videoId, apiKey)).rejects.toThrow(
      'Network error'
    );
  });
});
