# YouTube View Tracker - Development Guidelines

## Testing Requirements

**MANDATORY: Run tests after every code file update**

After modifying any JavaScript file in this project:
1. MUST run `npm test` to execute all tests
2. ALL tests must pass before considering the task complete
3. If tests fail, fix the issues before proceeding
4. Never commit code with failing tests

## Test Command
```bash
npm test
```

## Project Structure

- `extract-video-id.js` - CLI script for extracting YouTube Video IDs from URLs
- `extract-video-id.test.js` - Test suite for the extraction functionality

## Development Workflow

1. Make code changes
2. Run `npm test` immediately
3. Fix any failing tests
4. Only mark task as complete when all tests pass