// Guard anti-decapitação: impede que a admin-app derrube os workers de
// produção que servem a própria interface com um deploy/alteração defeituoso
// sem confirmação explícita do operador.

export const PROTECTED_WORKERS = ['admin-motor', 'tlsrpt-motor'];

export const PROTECTED_CONFIRM_PHRASE = 'EU ENTENDO O RISCO';

/** Erro tratado (HTTP 403) de mutação em worker protegido sem confirmação. */
export class ProtectedWorkerError extends Error {
  readonly status = 403;

  constructor(message: string) {
    super(message);
    this.name = 'ProtectedWorkerError';
  }
}

export function assertWorkerMutationAllowed(scriptName: string, confirmPhrase?: string): void {
  if (!PROTECTED_WORKERS.includes(scriptName)) {
    return;
  }

  if (confirmPhrase === PROTECTED_CONFIRM_PHRASE) {
    return;
  }

  throw new ProtectedWorkerError(
    `'${scriptName}' é um worker de PRODUÇÃO do próprio admin-app. Um deploy/alteração defeituoso pode derrubar esta interface (a recuperação exigirá dashboard/wrangler). Para prosseguir, envie confirmPhrase: '${PROTECTED_CONFIRM_PHRASE}'.`,
  );
}

// Projeto Pages que serve o frontend de produção da própria admin-app.
export const PROTECTED_PAGES_PROJECTS = ['admin-app'];

export function assertPagesProjectMutationAllowed(projectName: string, confirmPhrase?: string): void {
  if (!PROTECTED_PAGES_PROJECTS.includes(projectName)) {
    return;
  }

  if (confirmPhrase === PROTECTED_CONFIRM_PHRASE) {
    return;
  }

  throw new ProtectedWorkerError(
    `'${projectName}' é o projeto Pages de PRODUÇÃO que serve o frontend da própria admin-app. Excluí-lo derruba esta interface (a recuperação exigirá dashboard/wrangler). Para prosseguir, envie confirmPhrase: '${PROTECTED_CONFIRM_PHRASE}'.`,
  );
}

// Console avançado (raw-cloudflare-request): métodos mutantes sobre os
// recursos de produção do próprio admin são bloqueados SEMPRE — as mutações
// legítimas passam pelas rotas dedicadas, que aplicam os guards com frase.
const PROTECTED_RAW_PATH = new RegExp(
  `/(workers/scripts/(${PROTECTED_WORKERS.join('|')})|pages/projects/(${PROTECTED_PAGES_PROJECTS.join('|')}))(/|$|\\?)`,
);

// A CF decodifica percent-encoding no path; comparar o path CRU permitiria
// bypass via encoding (ex.: admin%2Dmotor). Decodifica em loop (cap 3, cobre
// duplo-encoding) antes de testar; falha de decode mantém o valor da iteração.
const decodeRawPathForGuard = (path: string): string => {
  let current = path;
  for (let i = 0; i < 3; i += 1) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      break;
    }
    if (decoded === current) {
      break;
    }
    current = decoded;
  }
  return current;
};

export function assertRawApiRequestAllowed(method: string, path: string): void {
  const normalizedMethod = method.trim().toUpperCase();
  if (normalizedMethod === 'GET') {
    return;
  }
  if (!PROTECTED_RAW_PATH.test(decodeRawPathForGuard(path))) {
    return;
  }
  throw new ProtectedWorkerError(
    `Operação ${normalizedMethod} bloqueada no console avançado: o path atinge um recurso de PRODUÇÃO do próprio admin-app (${path}). Use as rotas dedicadas do módulo, que exigem as confirmações de segurança.`,
  );
}
