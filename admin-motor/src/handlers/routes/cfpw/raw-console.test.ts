import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { onRequestGetRawAllowlist } from './raw-console';

type AllowlistBody = {
  ok: boolean;
  allowlist: string[];
  patterns: string[];
  methods: string[];
};

const buildContext = () => ({
  request: new Request('https://admin.test/api/cfpw/raw-allowlist'),
  env: { CLOUDFLARE_PW: 'pw-token', CF_ACCOUNT_ID: 'acct-1' },
});

describe('cfpw raw-console handler', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the allowlist shape with human labels, regex sources and methods', async () => {
    const response = await onRequestGetRawAllowlist(buildContext());
    const body = (await response.json()) as AllowlistBody;

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.methods).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
    expect(body.allowlist.length).toBeGreaterThanOrEqual(6);
    expect(body.allowlist.length).toBe(body.patterns.length);
    for (const label of body.allowlist) {
      expect(typeof label).toBe('string');
      expect(label.startsWith('/')).toBe(true);
    }
  });

  it('exposes regex sources that mirror the server-side raw validation', async () => {
    const response = await onRequestGetRawAllowlist(buildContext());
    const body = (await response.json()) as AllowlistBody;

    const regexes = body.patterns.map((source) => new RegExp(source));
    const isAllowed = (path: string) => regexes.some((regex) => regex.test(path));

    expect(isAllowed('/accounts/acct-1/workers/scripts')).toBe(true);
    expect(isAllowed('/accounts/acct-1/pages/projects')).toBe(true);
    expect(isAllowed('/zones?per_page=50')).toBe(true);
    expect(isAllowed('/user/tokens')).toBe(false);
    expect(isAllowed('/accounts/acct-1/d1/database')).toBe(false);
  });
});
