import fs from 'fs/promises';
import path from 'path';

export interface VideoStatistics {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
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
    statistics: {
      viewCount: string;
      likeCount: string;
      commentCount: string;
    };
  }>;
}

export class ViewershipTracker {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.YOUTUBE_API_KEY || '';

    if (!this.apiKey) {
      throw new Error(
        'YouTube API key is required. Provide it as a parameter or set YOUTUBE_API_KEY environment variable.'
      );
    }
  }

  async fetchVideoStatistics(videoId: string): Promise<VideoStatistics> {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${this.apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `YouTube API request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as YouTubeApiResponse;

    if (!data.items || data.items.length === 0) {
      throw new Error(`Video not found or not accessible: ${videoId}`);
    }

    const video = data.items[0];

    return {
      videoId,
      title: video.snippet.title,
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      viewCount: video.statistics.viewCount,
      likeCount: video.statistics.likeCount,
      commentCount: video.statistics.commentCount,
      retrievedAt: new Date().toISOString(),
    };
  }

  async saveStatisticsToJson(
    statistics: VideoStatistics,
    outputDir: string = './data'
  ): Promise<string> {
    await fs.mkdir(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `viewership-${statistics.videoId}-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);

    await fs.writeFile(filepath, JSON.stringify(statistics, null, 2));

    return filepath;
  }

  async trackViewership(videoId: string, outputDir?: string): Promise<string> {
    const statistics = await this.fetchVideoStatistics(videoId);
    const filepath = await this.saveStatisticsToJson(statistics, outputDir);

    return filepath;
  }
}

export async function createViewershipReport(
  videoId: string,
  apiKey?: string,
  outputDir?: string
): Promise<string> {
  const tracker = new ViewershipTracker(apiKey);
  return await tracker.trackViewership(videoId, outputDir);
}
