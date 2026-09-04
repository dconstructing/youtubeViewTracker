import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { describe, expect, test } from 'vitest';

/**
 * Regression tests for the static frontend (web/js/app.js). That file is plain
 * browser JS with no build step and no exports, so we run it inside a vm context
 * with a stubbed DOM and read its top-level function declarations off the
 * sandbox global. This locks in:
 *   - number formatting (Unknown vs 0 vs formatted),
 *   - the runtime backend selection precedence (?backend= > localStorage >
 *     default), and
 *   - the header dropdown wiring (options populated, change persists + validates)
 * so the deployed site can switch backends without a redeploy.
 */
const APP_SOURCE = readFileSync(
  join(process.cwd(), 'web', 'js', 'app.js'),
  'utf-8'
);

interface StubElement {
  style: Record<string, unknown>;
  textContent: string;
  value: string;
  children: unknown[];
  addEventListener: (event: string, handler: (arg?: unknown) => void) => void;
  appendChild: (child: unknown) => void;
  dispatch: (event: string, arg?: unknown) => void;
}

function makeElement(): StubElement {
  const listeners: Record<string, Array<(arg?: unknown) => void>> = {};
  const children: unknown[] = [];
  return {
    style: {},
    textContent: '',
    value: '',
    children,
    addEventListener(event, handler) {
      listeners[event] ??= [];
      listeners[event].push(handler);
    },
    appendChild(child) {
      children.push(child);
    },
    dispatch(event, arg) {
      for (const handler of listeners[event] ?? []) {
        handler(arg);
      }
    },
  };
}

interface LoadedApp {
  formatNumber: (value: unknown) => string;
  resolveBackend: () => string;
  store: Record<string, string>;
  elements: Record<string, StubElement>;
}

function loadApp(
  options: { search?: string; store?: Record<string, string> } = {}
): LoadedApp {
  const { search = '', store = {} } = options;
  const elements: Record<string, StubElement> = {};

  const sandbox: Record<string, unknown> = {
    console,
    URL,
    URLSearchParams,
    localStorage: {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
    },
    document: {
      getElementById: (id: string) => (elements[id] ??= makeElement()),
      querySelector: () => makeElement(),
      createElement: () => makeElement(),
      createRange: () => ({ selectNode: () => {} }),
    },
    window: {
      addEventListener: () => {},
      location: { search },
      getSelection: () => ({ removeAllRanges: () => {}, addRange: () => {} }),
    },
    navigator: { clipboard: { writeText: async () => {} } },
  };

  vm.createContext(sandbox);
  vm.runInContext(APP_SOURCE, sandbox);

  const formatNumber = sandbox.formatNumber as
    | ((value: unknown) => string)
    | undefined;
  const resolveBackend = sandbox.resolveBackend as (() => string) | undefined;
  if (
    typeof formatNumber !== 'function' ||
    typeof resolveBackend !== 'function'
  ) {
    throw new Error('web/js/app.js did not define the expected functions');
  }
  return { formatNumber, resolveBackend, store, elements };
}

describe('web/js/app.js formatNumber', () => {
  const { formatNumber } = loadApp();

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

describe('web/js/app.js backend selection', () => {
  test('defaults to cloudflare with no query param or stored choice', () => {
    expect(loadApp().resolveBackend()).toBe('cloudflare');
  });

  test('honors a valid ?backend= query param', () => {
    expect(loadApp({ search: '?backend=lambda' }).resolveBackend()).toBe(
      'lambda'
    );
  });

  test('persists the query-param choice to localStorage', () => {
    const app = loadApp({ search: '?backend=lambda' });
    // Persisted during module load so it survives after the param is dropped.
    expect(app.store['yvt.backend']).toBe('lambda');
  });

  test('uses the stored choice when no query param is present', () => {
    expect(
      loadApp({ store: { 'yvt.backend': 'lambda' } }).resolveBackend()
    ).toBe('lambda');
  });

  test('ignores an unknown backend value and falls back to default', () => {
    expect(loadApp({ search: '?backend=bogus' }).resolveBackend()).toBe(
      'cloudflare'
    );
  });

  test('rejects inherited Object.prototype keys in the query param', () => {
    // These are truthy via the prototype chain, so a `BACKENDS[key]` membership
    // check would wrongly accept them (and persist a broken choice).
    for (const key of [
      '__proto__',
      'constructor',
      'toString',
      'hasOwnProperty',
    ]) {
      const app = loadApp({ search: `?backend=${key}` });
      expect(app.resolveBackend()).toBe('cloudflare');
      expect(app.store['yvt.backend']).toBeUndefined();
    }
  });
});

describe('web/js/app.js backend dropdown', () => {
  test('populates the select with both backend options', () => {
    const { elements } = loadApp();
    // Cloudflare + Lambda.
    expect(elements['backend-select'].children).toHaveLength(2);
  });

  test('changing the dropdown persists the new backend', () => {
    const { elements, store } = loadApp();
    const select = elements['backend-select'];

    select.value = 'lambda';
    select.dispatch('change');

    expect(store['yvt.backend']).toBe('lambda');
  });

  test('changing to an unknown backend is ignored (not persisted)', () => {
    const { elements, store } = loadApp();
    const select = elements['backend-select'];

    select.value = 'bogus';
    select.dispatch('change');

    expect(store['yvt.backend']).toBeUndefined();
  });

  test('changing to an inherited prototype key is ignored', () => {
    const { elements, store } = loadApp();
    const select = elements['backend-select'];

    select.value = '__proto__';
    select.dispatch('change');

    expect(store['yvt.backend']).toBeUndefined();
  });
});
