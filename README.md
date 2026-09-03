# YouTube View Tracker

Hosted at: https://dconstructing.github.io/youtubeViewTracker/

A simple TypeScript tool for extracting viewership statistics from YouTube videos. The tool extracts Video IDs from YouTube URLs and fetches basic viewership data (views, likes, comments) via the YouTube Data API v3.

## Features

### Video ID Extraction
- ✅ **Multiple URL Format Support**: Handles standard watch URLs, short URLs, embed URLs, live URLs, and mobile URLs
- ✅ **Comprehensive Testing**: 11 test cases covering all URL formats and edge cases
- ✅ **CLI Interface**: Interactive command-line interface

### Viewership Tracking
- ✅ **Basic Stats**: Fetches view counts, likes, and comments from YouTube Data API v3
- ✅ **API Key Management**: Environment variable support with .env file integration
- ✅ **JSON Output**: Generated timestamped reports with video ID in filename
- ✅ **CLI Tool**: Command-line interface for data extraction
- ✅ **Web Interface**: Simple web frontend with AWS Lambda backend
- ✅ **AWS Lambda Deployment**: Serverless backend with SAM deployment
- ✅ **Cloudflare Workers Deployment**: Free-tier serverless backend via Wrangler
- ✅ **Testing**: 37 test cases covering functionality

### Technical Details
- ✅ **TypeScript**: Fully typed with strict TypeScript configuration
- ✅ **ES Modules**: Modern JavaScript module system
- ✅ **Error Handling**: Basic error handling for API failures and invalid inputs

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

Extract YouTube video statistics and generate JSON reports:

```bash
npm start
```

**Interactive mode:**
```
Enter YouTube URL or Video ID: https://www.youtube.com/watch?v=dQw4w9WgXcQ
Processing video ID: dQw4w9WgXcQ
Fetching data...
✅ Data saved to: data/viewership-dQw4w9WgXcQ-2025-07-23T02-52-24-076Z.json

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

## Architecture

The `/viewership` API is implemented once in a shared, dependency-free core
([`src/youtube-stats.ts`](src/youtube-stats.ts)) and served by three
interchangeable adapters, so the same logic runs everywhere:

| Adapter | Target | Notes |
|---------|--------|-------|
| [`src/worker.ts`](src/worker.ts) | Cloudflare Worker | Web `fetch` handler |
| [`src/lambda-handler.ts`](src/lambda-handler.ts) | AWS Lambda | API Gateway handler |
| [`src/viewership-tracker.ts`](src/viewership-tracker.ts) | CLI | Also writes JSON reports |

The static frontend in `web/` calls whichever backend `API_BASE_URL` (in
`web/js/app.js`) points at.

**For contributors:** change fetch/mapping logic in the shared core, not the
adapters, and keep `youtube-stats.ts` / `extract-video-id.ts` free of Node
built-ins so they still bundle into the Worker. Count fields are `string | null`
(`null` = not reported by YouTube → render "Unknown", never `0`). See
[`CLAUDE.md`](CLAUDE.md) → *Backend Architecture* for the full rationale.

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

## Cloudflare Workers Deployment

The backend can also run as a **Cloudflare Worker** — a free-tier-friendly,
zero-cost alternative to the AWS Lambda deployment. The Worker in
[`src/worker.ts`](src/worker.ts) is a like-for-like port of the Lambda handler:
same request validation, same YouTube Data API call, and the same JSON response
shape. It uses only the Web-standard `fetch`/`Request`/`Response` APIs, so no
Node.js polyfills are required.

Both backends can coexist. The intended migration path is to deploy the Worker,
verify it, and only then repoint the frontend at it — the AWS Lambda stack keeps
running until you're satisfied.

### Deployment Prerequisites

1. A [Cloudflare account](https://dash.cloudflare.com/sign-up) (the free plan is
   sufficient — Workers include 100,000 requests/day at no cost).
2. Wrangler is already included as a dev dependency (`npm install`).

### Quick Deployment

1. **Authenticate Wrangler** (opens a browser once):

   ```bash
   npx wrangler login
   ```

2. **Set the YouTube API key as a Worker secret** (not stored in the repo):

   ```bash
   npx wrangler secret put YOUTUBE_API_KEY
   ```

3. **Deploy** (runs the test suite first, then publishes):

   ```bash
   npm run deploy:cloudflare
   ```

   Wrangler prints the Worker URL, e.g.
   `https://youtube-viewership-tracker.<your-subdomain>.workers.dev`.

### Local Development

Copy the example secrets file and run the Worker locally:

```bash
cp .dev.vars.example .dev.vars   # then edit .dev.vars with your API key
npm run dev:cloudflare           # serves the Worker at http://localhost:8787
```

### Switching the Frontend to Cloudflare

Once you've verified the Worker, update `API_BASE_URL` in
[`web/js/app.js`](web/js/app.js) to the Worker's `/viewership` endpoint:

```javascript
const API_BASE_URL = 'https://youtube-viewership-tracker.<your-subdomain>.workers.dev/viewership';
```

The API contract is identical, so no other frontend changes are needed. After
confirming everything works, you can tear down the AWS Lambda stack to eliminate
its cost.

### Configuration

- [`wrangler.toml`](wrangler.toml) — Worker name, entry point, and compatibility
  date. The API key is a secret, so it is **not** stored here.
- The Worker exposes the same endpoints as the Lambda: `GET`/`POST`/`OPTIONS` on
  `/viewership`.

## Continuous Integration & Deployment

CI/CD runs through a single GitHub Actions workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

| Trigger | What runs |
|---------|-----------|
| Pull request into `master` | CI gate only: `format:check` → `typecheck` → `build:lambda` → `jest` |
| Push to `master` (PR merge) | CI gate, then — only if it passes — deploy frontend **and** backend |
| Manual `workflow_dispatch` | Same as a push to `master` (useful for re-deploys) |

The deploy jobs `needs: test`, so nothing ships unless the full test suite is green.
Deploys never run on pull requests.

### One-time setup

The frontend deploy works out of the box once Pages is enabled. The backend deploy
needs AWS access configured via GitHub OIDC (no long-lived AWS keys are stored).

**1. Enable GitHub Pages**

Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.

**2. Add repository secrets** (Settings → Secrets and variables → Actions → *Secrets*)

| Secret | Purpose |
|--------|---------|
| `YOUTUBE_API_KEY` | Passed to the Lambda as the `YouTubeApiKey` parameter |
| `AWS_DEPLOY_ROLE_ARN` | ARN of the IAM role Actions assumes via OIDC (see below) |

**3. Add a repository variable** (same page → *Variables*)

| Variable | Example |
|----------|---------|
| `AWS_REGION` | `us-east-1` |

**4. (Optional) Configure the `production` environment**

The backend job targets a `production` environment (Settings → Environments). Add
required reviewers there if you want a manual approval gate before the backend deploys.

### AWS OIDC role

Create an IAM identity provider and a role that GitHub Actions can assume:

1. **IAM → Identity providers → Add provider** (once per AWS account):
   - Provider URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`
2. Create an IAM role with this trust policy (restricts assumption to this repo):

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
         },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
           "StringLike": { "token.actions.githubusercontent.com:sub": "repo:dconstructing/youtubeViewTracker:*" }
         }
       }
     ]
   }
   ```

3. Grant the role permission to run the SAM deploy (CloudFormation, Lambda, API
   Gateway, IAM, and the SAM-managed S3 artifact bucket). `PowerUserAccess` plus
   `IAMFullAccess` works for a quick start; scope it down for production.
4. Put the role's ARN in the `AWS_DEPLOY_ROLE_ARN` secret.

> To tighten security further, replace the `sub` condition with
> `repo:dconstructing/youtubeViewTracker:environment:production` so only the
> `production` environment can assume the role.

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run build:lambda` | Compile TypeScript for Lambda deployment |
| `npm run dev` | Watch mode compilation |
| `npm start` | Run the viewership tracking CLI (primary feature) |
| `npm run extract` | Run the video ID extraction CLI |
| `npm test` | Run the test suite (37 tests) |
| `npm run typecheck` | Type checking without compilation |
| `npm run deploy:sam` | Build and deploy to AWS Lambda (PowerUserAccess) |
| `npm run deploy:sam:admin` | Build and deploy to AWS Lambda (Admin) |
| `npm run dev:cloudflare` | Run the Cloudflare Worker locally (Wrangler) |
| `npm run deploy:cloudflare` | Run tests and deploy the Cloudflare Worker |

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
│   ├── lambda-handler.ts           # AWS Lambda function handler
│   ├── worker.ts                   # Cloudflare Worker handler
│   └── worker.test.ts              # Cloudflare Worker tests
├── web/                            # Web interface
│   ├── index.html                  # Main HTML page
│   ├── css/styles.css              # Stylesheet
│   └── js/app.js                   # Frontend JavaScript
├── data/                           # Generated viewership reports (gitignored)
├── dist/                           # Compiled JavaScript output
├── template-simple.yaml            # AWS SAM deployment template
├── wrangler.toml                   # Cloudflare Worker configuration
├── tsconfig.json                   # TypeScript configuration (CLI)
├── tsconfig.serverless.json        # TypeScript configuration (Lambda)
├── .env.example                    # API key template
├── .dev.vars.example               # Cloudflare Worker local secrets template
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