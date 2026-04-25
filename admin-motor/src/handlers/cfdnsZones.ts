import { listCloudflareZones } from '../../../functions/api/_lib/cloudflare-api';

type Env = {
  CLOUDFLARE_DNS?: string;
  CLOUDFLARE_PW?: string;
};

type Context = {
  request: Request;
  env: Env;
};

const toHeaders = () => ({
  'Content-Type': 'application/json',
});

export const handleCfdnsZonesGet = async (context: Context) => {
  try {
    const zones = await listCloudflareZones(context.env);
    return new Response(
      JSON.stringify({
        ok: true,
        fonte: 'cloudflare-api',
        zones,
      }),
      { headers: toHeaders() },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao carregar zonas DNS da Cloudflare.';
    return new Response(
      JSON.stringify({
        ok: false,
        error: message,
      }),
      {
        status: 502,
        headers: toHeaders(),
      },
    );
  }
};
