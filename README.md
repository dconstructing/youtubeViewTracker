# YouTube View Tracker

A comprehensive TypeScript toolkit for YouTube video analysis, featuring Video ID extraction and viewership data tracking. This tool helps developers and content creators analyze YouTube videos by extracting Video IDs from URLs and fetching detailed viewership statistics via the YouTube Data API v3.

## Features

### Video ID Extraction
- ✅ **Multiple URL Format Support**: Handles standard watch URLs, short URLs, embed URLs, live URLs, and mobile URLs
- ✅ **Comprehensive Testing**: 11 test cases covering all URL formats and edge cases
- ✅ **CLI Interface**: Interactive command-line interface

### Viewership Tracking
- ✅ **Real Viewership Data**: Fetches final view counts, likes, comments from YouTube Data API v3
- ✅ **Secure API Key Management**: Environment variable support with .env file integration
- ✅ **JSON Reports**: Automatically generated timestamped reports with video ID in filename
- ✅ **CLI Tool**: Easy-to-use command-line interface for quick data extraction
- ✅ **Web Interface**: Modern web frontend with AWS Lambda backend
- ✅ **AWS Lambda Deployment**: Serverless backend with SAM deployment
- ✅ **Comprehensive Testing**: 28 test cases covering API interactions and edge cases

### Technical Excellence
- ✅ **TypeScript**: Fully typed with strict TypeScript configuration
- ✅ **ES Modules**: Modern JavaScript module system
- ✅ **Error Handling**: Robust error handling for API failures and invalid inputs

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
- YouTube Data API v3 key (for viewership tracking)
- AWS CLI configured with appropriate permissions (for Lambda deployment)
- AWS SAM CLI (for serverless deployment)

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

3. Set up your YouTube API key:
   ```bash
   cp .env.example .env
   # Edit .env and add your YouTube Data API v3 key
   ```

4. Build the project:
   ```bash
   npm run build
   ```

### YouTube API Setup

1. Go to the [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3
4. Create credentials (API key)
5. Add your API key to the `.env` file:
   ```
   YOUTUBE_API_KEY=your_api_key_here
   ```

## Usage

### Viewership Tracking (Primary Feature)

Track YouTube video viewership data and generate detailed JSON reports:

```bash
npm start
```

**Interactive mode:**
```
Enter YouTube URL or Video ID: https://www.youtube.com/watch?v=dQw4w9WgXcQ
Processing video ID: dQw4w9WgXcQ
Fetching viewership data...
✅ Viewership data saved to: data/viewership-dQw4w9WgXcQ-2025-07-23T02-52-24-076Z.json

📊 Summary:
Title: Rick Astley - Never Gonna Give You Up
Channel: RickAstleyVEVO
View Count: 1,234,567,890
Like Count: 12,345,678
Comment Count: 1,234,567
Published: 10/25/2009
Retrieved: 7/22/2025, 8:52:24 PM
```

**Command line argument:**
```bash
npm start -- "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
# or with just the video ID:
npm start -- "dQw4w9WgXcQ"
```

### Video ID Extraction (Alternative Feature)

Run the interactive CLI to extract Video IDs only:

```bash
npm run extract
```

The CLI will prompt you to enter a YouTube URL and will output:
- The extracted Video ID
- A ready-to-use YouTube Data API URL

### Programmatic Usage

Import and use the functions in your own TypeScript/JavaScript code:

```typescript
import { extractVideoId } from './dist/extract-video-id.js';
import { createViewershipReport, ViewershipTracker } from './dist/viewership-tracker.js';

// Extract Video ID
const videoId = extractVideoId('https://youtu.be/dQw4w9WgXcQ');
console.log(videoId); // Output: dQw4w9WgXcQ

// Get viewership data
const reportPath = await createViewershipReport(videoId);
console.log(`Report saved to: ${reportPath}`);

// Or use the class directly
const tracker = new ViewershipTracker(); // Uses YOUTUBE_API_KEY env var
const stats = await tracker.fetchVideoStatistics(videoId);
console.log(`Views: ${stats.viewCount}`);
```

## Web Interface

The project includes a modern web interface that connects to an AWS Lambda backend. The web interface provides:

- Interactive form for entering YouTube URLs or Video IDs
- Real-time data fetching with loading indicators
- Formatted display of video statistics
- JSON data export functionality
- Responsive design for mobile and desktop

### Web Interface Setup

1. **Local Development**: Open `web/index.html` in a browser
2. **Production**: Deploy the `web/` directory to any static hosting service (GitHub Pages, Netlify, etc.)

The web interface connects to the deployed Lambda API automatically.

## AWS Lambda Deployment

This project can be deployed as a serverless API using AWS Lambda and API Gateway.

### Deployment Prerequisites

1. **AWS CLI Setup**:
   ```bash
   # Install AWS CLI
   brew install awscli  # macOS
   # or download from https://aws.amazon.com/cli/
   
   # Configure AWS credentials
   aws configure sso
   ```

2. **AWS SAM CLI Setup**:
   ```bash
   # Install SAM CLI
   brew install aws-sam-cli  # macOS
   # or download from https://aws.amazon.com/serverless/sam/
   ```

3. **AWS Permissions**: Your AWS user/role needs these permissions:
   - `PowerUserAccess` (for routine deployments)
   - `AdministratorAccess` (for initial stack creation)

### Quick Deployment

1. **Set up environment variable**:
   ```bash
   export YOUTUBE_API_KEY="your_youtube_api_key_here"
   ```

2. **Deploy to AWS**:
   ```bash
   # For routine deployments (requires PowerUserAccess)
   npm run deploy:sam
   
   # For initial deployment or major changes (requires AdministratorAccess)
   npm run deploy:sam:admin
   ```

3. **Get your API URL**: The deployment will output your API Gateway endpoint URL.

### Manual Deployment Steps

If you prefer manual control over the deployment process:

1. **Build the Lambda function**:
   ```bash
   npm run build:lambda
   ```

2. **Deploy with SAM**:
   ```bash
   # Login to AWS (if using SSO)
   aws sso login --profile your-profile-name
   
   # Deploy the stack
   sam deploy \
     --template-file template-simple.yaml \
     --stack-name youtube-viewership-tracker \
     --capabilities CAPABILITY_IAM \
     --parameter-overrides YouTubeApiKey=$YOUTUBE_API_KEY \
     --profile your-profile-name \
     --resolve-s3
   ```

3. **Update web frontend**: Copy the API Gateway URL from the deployment output and update `web/js/app.js`:
   ```javascript
   const API_BASE_URL = 'https://your-api-id.execute-api.region.amazonaws.com/viewership';
   ```

### Deployment Profiles

The project supports different AWS profiles for deployment:

- **PowerUserAccess Profile**: For routine code updates and deployments
- **Admin Profile**: For initial deployment and infrastructure changes

```bash
# Configure profiles
aws configure sso --profile PowerUserAccess-123456789
aws configure sso --profile admin

# Use specific profile
npm run deploy:sam  # Uses PowerUserAccess profile
npm run deploy:sam:admin  # Uses admin profile
```

### API Endpoints

Once deployed, the Lambda function provides these endpoints:

- **GET** `/viewership?url=YOUTUBE_URL` - Fetch video data by URL
- **GET** `/viewership?videoId=VIDEO_ID` - Fetch video data by Video ID
- **POST** `/viewership` - Submit video data in request body

Example API usage:
```bash
curl "https://your-api-id.execute-api.region.amazonaws.com/viewership?url=https%3A//www.youtube.com/watch%3Fv%3DdQw4w9WgXcQ"
```

### Troubleshooting Deployment

**Permission Issues**:
- Ensure your AWS user has the necessary permissions
- Try using admin profile for initial deployment
- Check AWS CloudFormation logs in the AWS Console

**Build Issues**:
- Run `npm run build:lambda` manually to check for TypeScript errors
- Verify all dependencies are installed with `npm install`

**API Issues**:
- Check Lambda function logs in AWS CloudWatch
- Verify YouTube API key is set correctly in environment variables
- Test API endpoints directly with curl

### Deployment Architecture

The deployed solution includes:

- **AWS Lambda Function**: Serverless compute for API logic
- **API Gateway**: HTTP API for routing requests
- **CloudFormation Stack**: Infrastructure as code
- **S3 Bucket**: Managed bucket for deployment artifacts

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run build:lambda` | Compile TypeScript for Lambda deployment |
| `npm run dev` | Watch mode compilation |
| `npm start` | Run the viewership tracking CLI (primary feature) |
| `npm run extract` | Run the video ID extraction CLI |
| `npm test` | Run the test suite (28 tests) |
| `npm run typecheck` | Type checking without compilation |
| `npm run deploy:sam` | Build and deploy to AWS Lambda (PowerUserAccess) |
| `npm run deploy:sam:admin` | Build and deploy to AWS Lambda (Admin) |

### Project Structure

```
youtubeViewTracker/
├── src/
│   ├── extract-video-id.ts         # Video ID extraction logic
│   ├── extract-video-id.test.ts    # Video ID extraction tests
│   ├── viewership-tracker.ts       # Viewership data fetching
│   ├── viewership-tracker.test.ts  # Viewership tracking tests
│   ├── cli.ts                      # Primary CLI: Viewership tracking
│   ├── extract-cli.ts              # Alternative CLI: Video ID extraction
│   └── lambda-handler.ts           # AWS Lambda function handler
├── web/                            # Web interface
│   ├── index.html                  # Main HTML page
│   ├── css/styles.css              # Stylesheet
│   └── js/app.js                   # Frontend JavaScript
├── data/                           # Generated viewership reports (gitignored)
├── dist/                           # Compiled JavaScript output
├── template-simple.yaml            # AWS SAM deployment template
├── tsconfig.json                   # TypeScript configuration (CLI)
├── tsconfig.serverless.json        # TypeScript configuration (Lambda)
├── .env.example                    # API key template
├── jest.config.js                  # Jest testing configuration
├── package.json                    # Project dependencies and scripts
└── README.md                       # This file
```

### Running Tests

The project includes comprehensive tests covering all functionality:

```bash
npm test
```

**Test Coverage (28 total tests):**

*Video ID Extraction (11 tests):*
- ✅ Standard watch URLs
- ✅ Short URLs (youtu.be)
- ✅ Embed URLs
- ✅ Live stream URLs
- ✅ Mobile URLs
- ✅ URLs with additional parameters
- ✅ URLs without protocol
- ✅ Invalid URL handling
- ✅ Different Video ID formats

*Viewership Tracking (17 tests):*
- ✅ API key management (environment variables)
- ✅ YouTube API integration
- ✅ Error handling (network failures, invalid videos)
- ✅ JSON report generation
- ✅ File system operations
- ✅ Timestamp formatting
- ✅ Custom output directories

## JSON Report Format

Generated viewership reports contain comprehensive video data:

```json
{
  "videoId": "dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up",
  "channelTitle": "RickAstleyVEVO",
  "publishedAt": "2009-10-25T06:57:33Z",
  "viewCount": "1234567890",
  "likeCount": "12345678",
  "commentCount": "1234567",
  "retrievedAt": "2025-07-23T02:52:24.076Z"
}
```

Reports are automatically saved as: `data/viewership-{videoId}-{timestamp}.json`

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
- Tests must pass before committing (all 28 tests)
- Follow the existing code style and conventions
- Update tests when adding new functionality
- API keys must be managed via environment variables (.env file)
- Never commit API keys or generated data files to the repository

## License

ISC License

## Technical Details

- **TypeScript**: ES2022 target with strict type checking
- **Testing**: Jest with ts-jest for TypeScript support
- **Modules**: ES Modules with .js extensions for compatibility
- **Build**: TypeScript compiler with source maps and declarations