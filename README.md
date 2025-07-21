# YouTube Live Stream Video ID Extractor

A TypeScript CLI tool that extracts YouTube Video IDs from various YouTube URL formats. This tool is designed to help developers and content creators quickly parse YouTube URLs and obtain the unique Video ID needed for YouTube Data API calls.

## Features

- ✅ **Multiple URL Format Support**: Handles standard watch URLs, short URLs, embed URLs, live URLs, and mobile URLs
- ✅ **TypeScript**: Fully typed with strict TypeScript configuration
- ✅ **ES Modules**: Modern JavaScript module system
- ✅ **Comprehensive Testing**: 11 test cases covering all URL formats and edge cases
- ✅ **CLI Interface**: Interactive command-line interface
- ✅ **API Integration Ready**: Outputs ready-to-use YouTube Data API URLs

## Supported YouTube URL Formats

| Format | Example |
|--------|---------|
| Standard Watch | `https://www.youtube.com/watch?v=VIDEO_ID` |
| Short URL | `https://youtu.be/VIDEO_ID` |
| Embed URL | `https://www.youtube.com/embed/VIDEO_ID` |
| Live URL | `https://www.youtube.com/live/VIDEO_ID` |
| Mobile URL | `https://m.youtube.com/watch?v=VIDEO_ID` |

## Installation

### Prerequisites

- Node.js (version 16 or higher)
- npm

### Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd youtubeViewTracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Usage

### Interactive CLI

Run the interactive CLI to extract Video IDs:

```bash
npm start
```

The CLI will prompt you to enter a YouTube URL and will output:
- The extracted Video ID
- A ready-to-use YouTube Data API URL

**Example interaction:**
```
YouTube Live Stream Video ID Extractor
=====================================
Enter YouTube Live stream URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ

Extracted Video ID: dQw4w9WgXcQ
API URL: https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,statistics,snippet&id=dQw4w9WgXcQ&key={YOUR_API_KEY}
```

### Programmatic Usage

You can also import and use the extraction function in your own TypeScript/JavaScript code:

```typescript
import { extractVideoId } from './dist/extract-video-id.js';

const videoId = extractVideoId('https://youtu.be/dQw4w9WgXcQ');
console.log(videoId); // Output: dQw4w9WgXcQ
```

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run dev` | Watch mode compilation |
| `npm start` | Run the compiled CLI application |
| `npm test` | Run the test suite |
| `npm run typecheck` | Type checking without compilation |

### Project Structure

```
youtubeViewTracker/
├── src/
│   ├── extract-video-id.ts      # Main extraction logic
│   ├── extract-video-id.test.ts # Test suite
│   └── cli.ts                   # CLI entry point
├── dist/                        # Compiled JavaScript output
├── tsconfig.json               # TypeScript configuration
├── jest.config.js              # Jest testing configuration
├── package.json                # Project dependencies and scripts
└── README.md                   # This file
```

### Running Tests

The project includes comprehensive tests covering all URL formats and edge cases:

```bash
npm test
```

**Test Coverage:**
- ✅ Standard watch URLs
- ✅ Short URLs (youtu.be)
- ✅ Embed URLs
- ✅ Live stream URLs
- ✅ Mobile URLs
- ✅ URLs with additional parameters
- ✅ URLs without protocol
- ✅ Invalid URL handling
- ✅ Different Video ID formats

## API Integration

The extracted Video ID can be used with the YouTube Data API v3 to fetch:

- **Live Stream Details**: Concurrent viewers, scheduled times
- **Video Statistics**: View count, like count, comment count
- **Video Metadata**: Title, description, thumbnails

**Example API call:**
```bash
curl "https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,statistics,snippet&id=VIDEO_ID&key=YOUR_API_KEY"
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run tests: `npm test`
5. Build the project: `npm run build`
6. Commit your changes: `git commit -am 'Add feature'`
7. Push to the branch: `git push origin feature-name`
8. Submit a pull request

## Requirements

- All code must be written in TypeScript
- Tests must pass before committing
- Follow the existing code style and conventions
- Update tests when adding new functionality

## License

ISC License

## Technical Details

- **TypeScript**: ES2022 target with strict type checking
- **Testing**: Jest with ts-jest for TypeScript support
- **Modules**: ES Modules with .js extensions for compatibility
- **Build**: TypeScript compiler with source maps and declarations