import fs from 'node:fs/promises';
import {
  createViewershipReport,
  type VideoStatistics,
  ViewershipTracker,
} from './viewership-tracker.js';

// Mock fetch for testing
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock fs for testing
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ViewershipTracker', () => {
  let tracker: ViewershipTracker;
  const mockApiKey = 'test-api-key';
  const mockVideoId = 'dQw4w9WgXcQ';
  const originalEnv = process.env;

  beforeEach(() => {
    tracker = new ViewershipTracker(mockApiKey);
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    test('uses provided API key', () => {
      const tracker = new ViewershipTracker('explicit-key');
      expect(tracker).toBeInstanceOf(ViewershipTracker);
    });

    test('uses environment variable when no API key provided', () => {
      process.env.YOUTUBE_API_KEY = 'env-api-key';
      const tracker = new ViewershipTracker();
      expect(tracker).toBeInstanceOf(ViewershipTracker);
    });

    test('throws error when no API key is available', () => {
      delete process.env.YOUTUBE_API_KEY;
      expect(() => new ViewershipTracker()).toThrow(
        'YouTube API key is required. Provide it as a parameter or set YOUTUBE_API_KEY environment variable.'
      );
    });

    test('prefers explicit API key over environment variable', () => {
      process.env.YOUTUBE_API_KEY = 'env-key';
      const tracker = new ViewershipTracker('explicit-key');
      expect(tracker).toBeInstanceOf(ViewershipTracker);
    });
  });

  describe('fetchVideoStatistics', () => {
    const mockApiResponse = {
      items: [
        {
          id: mockVideoId,
          snippet: {
            title: 'Test Video Title',
            channelTitle: 'Test Channel',
            publishedAt: '2023-01-01T00:00:00Z',
          },
          statistics: {
            viewCount: '1000000',
            likeCount: '50000',
            commentCount: '1000',
          },
        },
      ],
    };

    test('successfully fetches video statistics', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const result = await tracker.fetchVideoStatistics(mockVideoId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${mockVideoId}&key=${mockApiKey}`
      );
      expect(result).toEqual({
        videoId: mockVideoId,
        title: 'Test Video Title',
        channelTitle: 'Test Channel',
        publishedAt: '2023-01-01T00:00:00Z',
        viewCount: '1000000',
        likeCount: '50000',
        commentCount: '1000',
        retrievedAt: expect.any(String),
      });
      expect(new Date(result.retrievedAt)).toBeInstanceOf(Date);
    });

    test('throws error when API request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      } as Response);

      await expect(tracker.fetchVideoStatistics(mockVideoId)).rejects.toThrow(
        'YouTube API request failed: 403 Forbidden'
      );
    });

    test('throws error when video not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      } as Response);

      await expect(tracker.fetchVideoStatistics(mockVideoId)).rejects.toThrow(
        `Video not found or not accessible: ${mockVideoId}`
      );
    });

    test('throws error when API returns invalid response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await expect(tracker.fetchVideoStatistics(mockVideoId)).rejects.toThrow(
        `Video not found or not accessible: ${mockVideoId}`
      );
    });

    test('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(tracker.fetchVideoStatistics(mockVideoId)).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('saveStatisticsToJson', () => {
    const mockStatistics: VideoStatistics = {
      videoId: mockVideoId,
      title: 'Test Video',
      channelTitle: 'Test Channel',
      publishedAt: '2023-01-01T00:00:00Z',
      viewCount: '1000000',
      likeCount: '50000',
      commentCount: '1000',
      retrievedAt: '2023-12-01T10:00:00.000Z',
    };

    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue();
    });

    test('saves statistics to JSON file with default directory', async () => {
      const result = await tracker.saveStatisticsToJson(mockStatistics);

      expect(mockFs.mkdir).toHaveBeenCalledWith('./data', { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringMatching(
          /^data\/viewership-dQw4w9WgXcQ-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/
        ),
        JSON.stringify(mockStatistics, null, 2)
      );
      expect(result).toMatch(
        /^data\/viewership-dQw4w9WgXcQ-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/
      );
    });

    test('saves statistics to JSON file with custom directory', async () => {
      const customDir = './custom-output';
      const result = await tracker.saveStatisticsToJson(
        mockStatistics,
        customDir
      );

      expect(mockFs.mkdir).toHaveBeenCalledWith(customDir, { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringMatching(
          /^custom-output\/viewership-dQw4w9WgXcQ-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/
        ),
        JSON.stringify(mockStatistics, null, 2)
      );
      expect(result).toMatch(
        /^custom-output\/viewership-dQw4w9WgXcQ-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/
      );
    });

    test('handles file system errors', async () => {
      mockFs.mkdir.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(
        tracker.saveStatisticsToJson(mockStatistics)
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('trackViewership', () => {
    const mockApiResponse = {
      items: [
        {
          id: mockVideoId,
          snippet: {
            title: 'Test Video Title',
            channelTitle: 'Test Channel',
            publishedAt: '2023-01-01T00:00:00Z',
          },
          statistics: {
            viewCount: '1000000',
            likeCount: '50000',
            commentCount: '1000',
          },
        },
      ],
    };

    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue();
    });

    test('successfully tracks viewership and saves to file', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const result = await tracker.trackViewership(mockVideoId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${mockVideoId}&key=${mockApiKey}`
      );
      expect(mockFs.mkdir).toHaveBeenCalledWith('./data', { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(result).toMatch(
        /^data\/viewership-dQw4w9WgXcQ-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/
      );
    });

    test('uses custom output directory when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const customDir = './reports';
      const result = await tracker.trackViewership(mockVideoId, customDir);

      expect(mockFs.mkdir).toHaveBeenCalledWith(customDir, { recursive: true });
      expect(result).toMatch(
        /^reports\/viewership-dQw4w9WgXcQ-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/
      );
    });
  });
});

describe('createViewershipReport', () => {
  const mockApiKey = 'test-api-key';
  const mockVideoId = 'dQw4w9WgXcQ';
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('creates viewership report successfully', async () => {
    const mockApiResponse = {
      items: [
        {
          id: mockVideoId,
          snippet: {
            title: 'Test Video Title',
            channelTitle: 'Test Channel',
            publishedAt: '2023-01-01T00:00:00Z',
          },
          statistics: {
            viewCount: '1000000',
            likeCount: '50000',
            commentCount: '1000',
          },
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    const result = await createViewershipReport(mockVideoId, mockApiKey);

    expect(result).toMatch(
      /^data\/viewership-dQw4w9WgXcQ-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/
    );
  });

  test('creates viewership report with custom output directory', async () => {
    const mockApiResponse = {
      items: [
        {
          id: mockVideoId,
          snippet: {
            title: 'Test Video Title',
            channelTitle: 'Test Channel',
            publishedAt: '2023-01-01T00:00:00Z',
          },
          statistics: {
            viewCount: '1000000',
            likeCount: '50000',
            commentCount: '1000',
          },
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    const customDir = './custom-reports';
    const result = await createViewershipReport(
      mockVideoId,
      mockApiKey,
      customDir
    );

    expect(result).toMatch(
      /^custom-reports\/viewership-dQw4w9WgXcQ-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/
    );
  });

  test('uses environment variable for API key when not provided', async () => {
    process.env.YOUTUBE_API_KEY = 'env-api-key';

    const mockApiResponse = {
      items: [
        {
          id: mockVideoId,
          snippet: {
            title: 'Test Video Title',
            channelTitle: 'Test Channel',
            publishedAt: '2023-01-01T00:00:00Z',
          },
          statistics: {
            viewCount: '1000000',
            likeCount: '50000',
            commentCount: '1000',
          },
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    const result = await createViewershipReport(mockVideoId);

    expect(mockFetch).toHaveBeenCalledWith(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${mockVideoId}&key=env-api-key`
    );
    expect(result).toMatch(
      /^data\/viewership-dQw4w9WgXcQ-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/
    );
  });
});
