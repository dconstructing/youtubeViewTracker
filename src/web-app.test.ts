import { readFileSync } from 'fs';
import { join } from 'path';
import vm from 'vm';

/**
 * Regression tests for the static frontend's number formatting
 * (web/js/app.js). That file is plain browser JS with no build step and no
 * exports, so we run it inside a vm context with a stubbed DOM and read the
 * top-level `formatNumber` function off the sandbox global. This locks in the
 * "Unknown"-vs-"0" rendering so a refactor can't silently reintroduce a false
 * 0 (or a "NaN") for counts the API reports as null.
 */
function loadFormatNumber(): (value: unknown) => string {
  const source = readFileSync(
    join(process.cwd(), 'web', 'js', 'app.js'),
    'utf-8'
  );

  const stubElement: Record<string, unknown> = {
    style: {},
    textContent: '',
    value: '',
    addEventListener: () => {},
  };

  const sandbox: Record<string, unknown> = {
    console,
    document: {
      getElementById: () => stubElement,
      querySelector: () => stubElement,
      createRange: () => ({ selectNode: () => {} }),
    },
    window: {
      addEventListener: () => {},
      location: { search: '' },
      getSelection: () => ({ removeAllRanges: () => {}, addRange: () => {} }),
    },
    navigator: { clipboard: { writeText: async () => {} } },
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);

  const formatNumber = sandbox.formatNumber as
    | ((value: unknown) => string)
    | undefined;
  if (typeof formatNumber !== 'function') {
    throw new Error('formatNumber was not defined by web/js/app.js');
  }
  return formatNumber;
}

describe('web/js/app.js formatNumber', () => {
  const formatNumber = loadFormatNumber();

  test('renders "Unknown" for a null count (e.g. hidden likes)', () => {
    expect(formatNumber(null)).toBe('Unknown');
  });

  test('renders "Unknown" for an undefined count', () => {
    expect(formatNumber(undefined)).toBe('Unknown');
  });

  test('renders "Unknown" for a non-numeric value', () => {
    expect(formatNumber('not-a-number')).toBe('Unknown');
  });

  test('preserves a genuine zero as "0", not "Unknown"', () => {
    expect(formatNumber('0')).toBe('0');
  });

  test('formats a numeric string with locale grouping', () => {
    // Compare against the runtime's own locale output to avoid environment
    // assumptions about the default locale.
    expect(formatNumber('1810959953')).toBe((1810959953).toLocaleString());
  });
});
