#!/usr/bin/env node

import readline from 'node:readline';
import { extractVideoId } from './extract-video-id.js';

export function promptForUrl(): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Enter YouTube Live stream URL: ', (url: string) => {
    if (!url.trim()) {
      console.log('Error: Please enter a valid URL');
      rl.close();
      promptForUrl();
      return;
    }

    const videoId = extractVideoId(url.trim());

    if (videoId) {
      console.log(`\nExtracted Video ID: ${videoId}`);
      console.log(
        `API URL: https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,statistics,snippet&id=${videoId}&key={YOUR_API_KEY}`
      );
    } else {
      console.log('Error: Could not extract Video ID from the provided URL');
      console.log('Please ensure the URL is a valid YouTube URL');
    }

    rl.close();
  });
}

console.log('YouTube Live Stream Video ID Extractor');
console.log('=====================================');
promptForUrl();
