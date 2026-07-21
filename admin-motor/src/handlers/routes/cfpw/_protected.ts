// Guard anti-decapitação: impede que a admin-app derrube os workers de
// produção que servem a própria interface com um deploy/alteração defeituoso
// sem confirmação explícita do operador.

const PROTECTED_WORKERS = ['admin-motor', 'tlsrpt-motor'];

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
const PROTECTED_PAGES_PROJECTS = ['admin-app'];

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
