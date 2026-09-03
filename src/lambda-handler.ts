import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { extractVideoId } from './extract-video-id';
import type { VideoStatistics } from './youtube-stats';
import { fetchVideoStatistics } from './youtube-stats';

interface LambdaRequestBody {
  url?: string;
  videoId?: string;
}

interface LambdaResponse {
  success: boolean;
  data?: VideoStatistics;
  error?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Handle CORS preflight - check both httpMethod and requestContext for compatibility.
  // API Gateway v2 (HTTP API) reports the verb at requestContext.http.method, which
  // is not on the v1 APIGatewayProxyEvent type.
  const method =
    event.httpMethod ||
    (event.requestContext as { http?: { method?: string } })?.http?.method;
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
    const apiKey = process.env.YOUTUBE_API_KEY || '';
    if (!apiKey) {
      throw new Error(
        'YouTube API key is required. Set YOUTUBE_API_KEY environment variable.'
      );
    }
    const statistics = await fetchVideoStatistics(videoId, apiKey);

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
