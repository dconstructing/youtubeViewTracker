#!/usr/bin/env node

import 'dotenv/config';
import readline from 'node:readline';
import { extractVideoId } from './extract-video-id.js';
import { createViewershipReport } from './viewership-tracker.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    await promptForInput();
  } else {
    const input = args[0];
    await processInput(input);
  }
}

async function promptForInput(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question('Enter YouTube URL or Video ID: ', async (input: string) => {
      rl.close();
      await processInput(input.trim());
      resolve();
    });
  });
}

async function processInput(input: string): Promise<void> {
  if (!input) {
    console.error('Error: Please provide a YouTube URL or Video ID');
    process.exit(1);
  }

  let videoId: string | null = null;

  // Check if input is already a video ID (11 characters, alphanumeric + - and _)
  if (input.match(/^[a-zA-Z0-9_-]{11}$/)) {
    videoId = input;
  } else {
    // Try to extract video ID from URL
    videoId = extractVideoId(input);
  }

  if (!videoId) {
    console.error('Error: Could not extract Video ID from the provided input');
    console.error(
      'Please provide a valid YouTube URL or 11-character Video ID'
    );
    process.exit(1);
  }

  try {
    console.log(`Processing video ID: ${videoId}`);
    console.log('Fetching viewership data...');

    const outputPath = await createViewershipReport(videoId);

    console.log(`✅ Viewership data saved to: ${outputPath}`);

    // Read and display data
    const fs = await import('node:fs/promises');
    const data = JSON.parse(await fs.readFile(outputPath, 'utf-8'));

    console.log('\n📊 Summary:');
    console.log(`Title: ${data.title}`);
    console.log(`Channel: ${data.channelTitle}`);
    console.log(`View Count: ${parseInt(data.viewCount, 10).toLocaleString()}`);
    console.log(`Like Count: ${parseInt(data.likeCount, 10).toLocaleString()}`);
    console.log(
      `Comment Count: ${parseInt(data.commentCount, 10).toLocaleString()}`
    );
    console.log(
      `Published: ${new Date(data.publishedAt).toLocaleDateString()}`
    );
    console.log(`Retrieved: ${new Date(data.retrievedAt).toLocaleString()}`);

    console.log('\n📄 Full JSON Data:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(
      'Error fetching viewership data:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}
