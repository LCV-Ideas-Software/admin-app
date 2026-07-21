// Console avançado (API Cloudflare) — PW-2.
// GET /api/cfpw/raw-allowlist — expõe a allowlist de paths e métodos aceitos
// pela action raw-cloudflare-request (ops.ts), derivada da MESMA fonte usada
// na validação do servidor (CF_RAW_PATH_ALLOWLIST / CF_RAW_ALLOWED_METHODS em
// cfpw-api.ts). `allowlist` traz as descrições humanas; `patterns` traz os
// sources das regex para pré-validação no cliente (o servidor segue sendo a
// autoridade).

import { CF_RAW_ALLOWED_METHODS, CF_RAW_PATH_ALLOWLIST } from '../_lib/cfpw-api';
import { createResponseTrace } from '../_lib/request-trace';
import { type CfpwRouteContext, getRouteEnv, logCfpwEvent, toJsonResponse } from './_respond';

export async function onRequestGetRawAllowlist(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  const allowlist = CF_RAW_PATH_ALLOWLIST.map((entry) => entry.label);
  const patterns = CF_RAW_PATH_ALLOWLIST.map((entry) => entry.pattern.source);
  const methods = [...CF_RAW_ALLOWED_METHODS];

  await logCfpwEvent(env, 'raw-allowlist', true, { entries: allowlist.length });

  return toJsonResponse({
    ok: true,
    ...trace,
    allowlist,
    patterns,
    methods,
  });
}
