#!/usr/bin/env node

import readline from 'node:readline';
import { extractVideoId } from './extract-video-id.js';
import { createViewershipReport } from './viewership-tracker.js';
import type { VideoStatistics } from './youtube-stats.js';

/**
 * .env is optional - process.loadEnvFile throws ENOENT when absent (e.g. CI,
 * or a shell that already exports YOUTUBE_API_KEY), unlike dotenv's config(),
 * which stays silent. Swallow that case to match; anything else (including a
 * malformed .env) is real and propagates to main()'s catch below.
 *
 * Note: unlike dotenv, this doesn't strip a UTF-8 BOM, so a .env saved with
 * one (e.g. by Windows Notepad) will silently fail to set YOUTUBE_API_KEY.
 *
 * Called from main(), not at module scope, so importing this file (as the
 * test suite does for formatCount) never triggers a real env-file read.
 */
export function loadEnv(): void {
  try {
    process.loadEnvFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Render a count field for display. Counts are null when YouTube doesn't
 * report them (hidden likes, disabled comments) - render that as "Unknown"
 * rather than a misleading 0 or NaN. Only digit strings are treated as
 * valid; anything else (including partially-numeric junk like "123abc") is
 * "Unknown" too, rather than silently truncated by parseInt.
 *
 * Kept CLI-local rather than in the shared core since this is display
 * formatting, not fetch/normalize logic, and cli.ts is its only consumer.
 * Mirrors formatNumber() in web/js/app.js - that file has no build step and
 * can't import this, so keep the two in sync by hand if this rule changes.
 */
export function formatCount(count: string | null): string {
  if (count === null || !/^\d+$/.test(count)) {
    return 'Unknown';
  }
  return parseInt(count, 10).toLocaleString();
}

async function main(): Promise<void> {
  loadEnv();

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
    const data: VideoStatistics = JSON.parse(
      await fs.readFile(outputPath, 'utf-8')
    );

    console.log('\n📊 Summary:');
    console.log(`Title: ${data.title}`);
    console.log(`Channel: ${data.channelTitle}`);
    console.log(`View Count: ${formatCount(data.viewCount)}`);
    console.log(`Like Count: ${formatCount(data.likeCount)}`);
    console.log(`Comment Count: ${formatCount(data.commentCount)}`);
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
