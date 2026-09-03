import fs from 'node:fs/promises';
import path from 'node:path';
import { fetchVideoStatistics } from './youtube-stats.js';

// Re-exported so existing importers keep resolving these from this module.
export type { VideoStatistics, YouTubeApiResponse } from './youtube-stats.js';

import type { VideoStatistics } from './youtube-stats.js';

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
    return fetchVideoStatistics(videoId, this.apiKey);
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
