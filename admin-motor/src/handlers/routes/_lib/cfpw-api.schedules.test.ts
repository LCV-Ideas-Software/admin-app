import { afterEach, describe, expect, it, vi } from 'vitest';
import { cfEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { getCloudflareWorkerSchedules } from './cfpw-api';

const env = { CLOUDFLARE_PW: 'token-pw' };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getCloudflareWorkerSchedules', () => {
  it('extrai schedules do result em objeto { schedules: [...] } (shape real da CF)', async () => {
    stubCloudflareFetch([
      {
        method: 'GET',
        url: /\/accounts\/acc-1\/workers\/scripts\/meu-worker\/schedules$/,
        reply: { json: cfEnvelope({ schedules: [{ cron: '*/5 * * * *' }, { cron: '0 3 * * *' }] }) },
      },
    ]);

    const schedules = await getCloudflareWorkerSchedules(env, 'acc-1', 'meu-worker');
    expect(schedules).toEqual([{ cron: '*/5 * * * *' }, { cron: '0 3 * * *' }]);
  });

  it('aceita result em array puro (compatibilidade defensiva)', async () => {
    stubCloudflareFetch([
      {
        method: 'GET',
        url: /\/schedules$/,
        reply: { json: cfEnvelope([{ cron: '*/30 * * * *' }]) },
      },
    ]);

    const schedules = await getCloudflareWorkerSchedules(env, 'acc-1', 'meu-worker');
    expect(schedules).toEqual([{ cron: '*/30 * * * *' }]);
  });

  it('retorna lista vazia quando o result não traz schedules', async () => {
    stubCloudflareFetch([
      {
        method: 'GET',
        url: /\/schedules$/,
        reply: { json: cfEnvelope({}) },
      },
    ]);

    const schedules = await getCloudflareWorkerSchedules(env, 'acc-1', 'meu-worker');
    expect(schedules).toEqual([]);
  });
});
