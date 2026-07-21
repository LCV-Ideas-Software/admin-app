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
