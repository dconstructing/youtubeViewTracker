#!/usr/bin/env node

import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

export function extractVideoId(url: string): string | null {
  // Handle different YouTube URL formats
  const patterns: RegExp[] = [
    // Standard watch URLs: https://www.youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // Short URLs: https://youtu.be/VIDEO_ID
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // Embedded URLs: https://www.youtube.com/embed/VIDEO_ID
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    // Live URLs: https://www.youtube.com/live/VIDEO_ID
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    // Mobile URLs: https://m.youtube.com/watch?v=VIDEO_ID
    /(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

export function promptForUrl(): void {
  rl.question('Enter YouTube Live stream URL: ', (url: string) => {
    if (!url.trim()) {
      console.log('Error: Please enter a valid URL');
      promptForUrl();
      return;
    }

    const videoId = extractVideoId(url.trim());
    
    if (videoId) {
      console.log(`\nExtracted Video ID: ${videoId}`);
      console.log(`API URL: https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,statistics,snippet&id=${videoId}&key={YOUR_API_KEY}`);
    } else {
      console.log('Error: Could not extract Video ID from the provided URL');
      console.log('Please ensure the URL is a valid YouTube URL');
    }
    
    rl.close();
  });
}

// Run CLI - will be handled by build script
// This is temporarily commented out for testing compatibility
// if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
//   console.log('YouTube Live Stream Video ID Extractor');
//   console.log('=====================================');
//   promptForUrl();
// }