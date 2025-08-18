import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { extractVideoId } from './extract-video-id';
import { VideoStatistics, YouTubeApiResponse } from './viewership-tracker';

interface LambdaRequestBody {
  url?: string;
  videoId?: string;
}

interface LambdaResponse {
  success: boolean;
  data?: VideoStatistics;
  error?: string;
}

class LambdaViewershipTracker {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || '';

    if (!this.apiKey) {
      throw new Error(
        'YouTube API key is required. Set YOUTUBE_API_KEY environment variable.'
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
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Handle CORS preflight - check both httpMethod and requestContext for compatibility
  const method =
    event.httpMethod || (event.requestContext as any)?.http?.method;
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    // Parse request body
    let requestBody: LambdaRequestBody = {};

    if (event.body) {
      requestBody = JSON.parse(event.body);
    }

    // Extract video ID from URL parameter or request body
    let videoId: string | null = null;

    if (event.queryStringParameters?.videoId) {
      videoId = event.queryStringParameters.videoId;
    } else if (event.queryStringParameters?.url) {
      videoId = extractVideoId(event.queryStringParameters.url);
    } else if (requestBody.videoId) {
      videoId = requestBody.videoId;
    } else if (requestBody.url) {
      videoId = extractVideoId(requestBody.url);
    }

    if (!videoId) {
      const response: LambdaResponse = {
        success: false,
        error:
          'Video ID is required. Provide either a videoId or a YouTube URL.',
      };

      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify(response),
      };
    }

    // Validate video ID format
    if (!videoId.match(/^[a-zA-Z0-9_-]{11}$/)) {
      const response: LambdaResponse = {
        success: false,
        error: 'Invalid video ID format. Must be 11 characters long.',
      };

      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify(response),
      };
    }

    // Fetch video statistics
    const tracker = new LambdaViewershipTracker();
    const statistics = await tracker.fetchVideoStatistics(videoId);

    const response: LambdaResponse = {
      success: true,
      data: statistics,
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Lambda error:', error);

    const response: LambdaResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify(response),
    };
  }
};
