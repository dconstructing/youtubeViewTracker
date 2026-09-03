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

## Code Style

[Biome](https://biomejs.dev) handles both formatting and linting for `src/**/*.ts`
(config: `biome.json`).

- `npm run check` - lint + format check, no writes (this is the CI gate)
- `npm run check:fix` - apply safe lint fixes and formatting
- The pre-commit hook runs `biome check --write` on staged `src/**/*.ts` via lint-staged.
- `build` / `test` do not format - keep the tree clean via the hook or `check:fix`.

Fix lint findings rather than suppressing them; if a rule genuinely doesn't fit,
adjust `linter.rules` in `biome.json` so the intent is visible in review.

## Project Structure

Source is TypeScript ES modules in `src/`, each with a co-located `*.test.ts`:

- `youtube-stats.ts` - shared core: fetches and normalizes video statistics from the YouTube Data API
- `extract-video-id.ts` - pure helper that parses a video ID out of a YouTube URL
- `worker.ts` - Cloudflare Worker entry (Web `fetch` handler)
- `lambda-handler.ts` - AWS Lambda entry (API Gateway handler)
- `viewership-tracker.ts` - CLI-facing class: shared core plus JSON file output
- `cli.ts` / `extract-cli.ts` - CLI entry points; Node-only code (e.g. `readline` prompts) lives here

Frontend: `web/` (static HTML/CSS/JS, no build step); `web/js/app.js` calls the deployed backend.
Deploy config: `wrangler.toml` (Cloudflare Worker), `template-simple.yaml` (AWS SAM / Lambda).

## Backend Architecture

The `/viewership` API is implemented once in the shared core `src/youtube-stats.ts`
(`fetchVideoStatistics`) and served by three interchangeable adapters that only
translate each platform's request/response types:

- `worker.ts` -> Cloudflare Worker
- `lambda-handler.ts` -> AWS Lambda
- `viewership-tracker.ts` -> CLI (adds JSON file output)

Two invariants keep this working - preserve them:

1. **Keep the shared modules dependency-free.** `youtube-stats.ts` and
   `extract-video-id.ts` must not import Node built-ins (`fs`, `path`,
   `readline`, ...) or they will not bundle into the Cloudflare Worker. Put
   Node-only code in the `*-cli.ts` entry points. Verify a change bundles with
   `npx wrangler deploy --dry-run -c wrangler.toml`.
2. **Counts can be `null`.** `viewCount` / `likeCount` / `commentCount` are
   typed `string | null`; `null` means YouTube did not report the value (hidden
   likes, disabled comments). Render it as "Unknown" - never coerce to `0`.

Change fetch or field-mapping logic in the shared core, not in the adapters.

## Development Workflow

1. Make code changes
2. Run `npm test` immediately
3. Fix any failing tests
4. Only mark task as complete when all tests pass