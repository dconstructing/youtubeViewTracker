import { extractVideoId } from './extract-video-id.js';

describe('extractVideoId', () => {
  test('extracts video ID from standard watch URL', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    expect(extractVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  test('extracts video ID from short URL', () => {
    const url = 'https://youtu.be/dQw4w9WgXcQ';
    expect(extractVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  test('extracts video ID from embed URL', () => {
    const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    expect(extractVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  test('extracts video ID from live URL', () => {
    const url = 'https://www.youtube.com/live/dQw4w9WgXcQ';
    expect(extractVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  test('extracts video ID from mobile URL', () => {
    const url = 'https://m.youtube.com/watch?v=dQw4w9WgXcQ';
    expect(extractVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  test('handles URLs with additional parameters', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s&list=PLI5YfMzCfRtZ8eV576YoY3vIYrHjyVm_e';
    expect(extractVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  test('handles URLs without protocol', () => {
    const url = 'youtube.com/watch?v=dQw4w9WgXcQ';
    expect(extractVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  test('handles URLs with www prefix variations', () => {
    const url = 'www.youtube.com/watch?v=dQw4w9WgXcQ';
    expect(extractVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  test('returns null for invalid URLs', () => {
    expect(extractVideoId('https://example.com')).toBe(null);
    expect(extractVideoId('not-a-url')).toBe(null);
    expect(extractVideoId('')).toBe(null);
  });

  test('returns null for YouTube URLs without video ID', () => {
    expect(extractVideoId('https://www.youtube.com')).toBe(null);
    expect(extractVideoId('https://www.youtube.com/channel/UC123')).toBe(null);
  });

  test('handles different video ID formats', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=ABC123def_-')).toBe('ABC123def_-');
    expect(extractVideoId('https://youtu.be/Z1bcYjVJpNU')).toBe('Z1bcYjVJpNU');
  });
});