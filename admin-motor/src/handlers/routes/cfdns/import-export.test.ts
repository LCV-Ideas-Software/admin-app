import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { onRequestGetExport, onRequestPostImport } from './import-export.ts';

const EXPORT_URL = 'https://api.cloudflare.com/client/v4/zones/zone-1/dns_records/export';
const IMPORT_URL = 'https://api.cloudflare.com/client/v4/zones/zone-1/dns_records/import';

const BIND_BODY = ';; Domain: example.com\nexample.com.\t300\tIN\tA\t192.0.2.1\n';

type ImportBody = {
  ok: boolean;
  zoneId?: string;
  error?: string;
  recsAdded?: number;
  totalRecordsParsed?: number;
};

const getExport = (query: string) =>
  onRequestGetExport({
    request: new Request(`https://admin.test/api/cfdns/export${query}`),
    env: { CLOUDFLARE_DNS: 'dns-token' },
  });

const postImport = (formData: FormData) =>
  onRequestPostImport({
    request: new Request('https://admin.test/api/cfdns/import', {
      method: 'POST',
      body: formData,
    }),
    env: { CLOUDFLARE_DNS: 'dns-token' },
  });

const buildImportForm = (options?: { proxied?: string; fileBytes?: number; withFile?: boolean }) => {
  const formData = new FormData();
  formData.append('zoneId', 'zone-1');
  if (options?.withFile !== false) {
    const content = options?.fileBytes != null ? new Uint8Array(options.fileBytes) : BIND_BODY;
    formData.append('file', new File([content], 'zona.txt', { type: 'text/plain' }));
  }
  if (options?.proxied != null) {
    formData.append('proxied', options.proxied);
  }
  return formData;
};

describe('cfdns import/export handlers', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('exports the zone as text/plain with the zone name in the download filename', async () => {
    stubCloudflareFetch([{ method: 'GET', url: EXPORT_URL, reply: { body: BIND_BODY } }]);

    const response = await getExport('?zoneId=zone-1&zoneName=example.com');

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="example.com.txt"');
    expect(await response.text()).toBe(BIND_BODY);
  });

  it('falls back to the zoneId in the filename when zoneName is absent', async () => {
    stubCloudflareFetch([{ method: 'GET', url: EXPORT_URL, reply: { body: BIND_BODY } }]);

    const response = await getExport('?zoneId=zone-1');

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="zone-1.txt"');
  });

  it('rejects an export without zoneId with 400', async () => {
    const response = await getExport('');
    const body = (await response.json()) as ImportBody;

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('zoneId');
  });

  it('imports a BIND file forwarding FormData with the file and proxied string to Cloudflare', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'POST', url: IMPORT_URL, reply: { json: cfEnvelope({ recs_added: 5, total_records_parsed: 8 }) } },
    ]);

    const response = await postImport(buildImportForm({ proxied: 'true' }));
    const body = (await response.json()) as ImportBody;

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.zoneId).toBe('zone-1');
    expect(body.recsAdded).toBe(5);
    expect(body.totalRecordsParsed).toBe(8);

    const forwarded = calls[0]?.init?.body;
    expect(forwarded).toBeInstanceOf(FormData);
    const cfForm = forwarded as FormData;
    expect(cfForm.get('proxied')).toBe('true');
    const file = cfForm.get('file');
    expect(file).toBeInstanceOf(File);
    expect((file as File).name).toBe('zona.txt');
    expect(await (file as File).text()).toBe(BIND_BODY);
  });

  it('defaults proxied to the string false when the field is absent', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'POST', url: IMPORT_URL, reply: { json: cfEnvelope({ recs_added: 1, total_records_parsed: 1 }) } },
    ]);

    const response = await postImport(buildImportForm());

    expect(response.status).toBe(200);
    const forwarded = calls[0]?.init?.body as FormData;
    expect(forwarded.get('proxied')).toBe('false');
  });

  it('rejects a file above 2 MB with 400 before calling Cloudflare', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await postImport(buildImportForm({ fileBytes: 2_000_001 }));
    const body = (await response.json()) as ImportBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('excede 2 MB');
    expect(calls).toHaveLength(0);
  });

  it('rejects an import without file with 400', async () => {
    const response = await postImport(buildImportForm({ withFile: false }));
    const body = (await response.json()) as ImportBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('file');
  });
});
