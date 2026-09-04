import { afterEach, describe, expect, test, vi } from 'vitest';
import { formatCount, loadEnv } from './cli.js';

describe('loadEnv', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('does not throw when .env is absent (ENOENT)', () => {
    vi.spyOn(process, 'loadEnvFile').mockImplementation(() => {
      throw Object.assign(new Error('no such file'), { code: 'ENOENT' });
    });

    expect(() => loadEnv()).not.toThrow();
  });

  test('rethrows errors other than ENOENT (e.g. a malformed .env)', () => {
    vi.spyOn(process, 'loadEnvFile').mockImplementation(() => {
      throw Object.assign(new Error('invalid syntax'), {
        code: 'ERR_INVALID_ARG_VALUE',
      });
    });

    expect(() => loadEnv()).toThrow('invalid syntax');
  });

  test('loads the .env file when present', () => {
    const loadEnvFile = vi
      .spyOn(process, 'loadEnvFile')
      .mockImplementation(() => {});

    loadEnv();

    expect(loadEnvFile).toHaveBeenCalledOnce();
  });
});

describe('formatCount', () => {
  test('renders null as Unknown', () => {
    expect(formatCount(null)).toBe('Unknown');
  });

  test('renders a non-numeric string as Unknown', () => {
    expect(formatCount('not-a-number')).toBe('Unknown');
  });

  test('renders a partially-numeric string as Unknown rather than truncating it', () => {
    // parseInt("123abc", 10) is 123 - make sure junk suffixes are rejected
    // outright instead of silently parsed down to a wrong number.
    expect(formatCount('123abc')).toBe('Unknown');
  });

  test('renders zero as 0', () => {
    expect(formatCount('0')).toBe('0');
  });

  test('renders a large count with locale grouping', () => {
    expect(formatCount('1810959953')).toBe((1810959953).toLocaleString());
  });
});
