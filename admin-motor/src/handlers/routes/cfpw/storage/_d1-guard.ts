// Guard de proteção do bigdata_db (ST-D1): o banco D1 operacional do próprio
// admin-app é IMUTÁVEL por política do workspace (sem rename/rotação).
// Exclusão e import são bloqueados SEMPRE (403, sem override); SQL de escrita
// exige a frase de confirmação explícita do operador.

import { PROTECTED_CONFIRM_PHRASE } from '../_protected';

export const PROTECTED_D1_NAMES = ['bigdata_db'];

/** Erro tratado (HTTP 403) de operação bloqueada em banco D1 protegido. */
export class ProtectedD1Error extends Error {
  readonly status = 403;

  constructor(message: string) {
    super(message);
    this.name = 'ProtectedD1Error';
  }
}

export const isProtectedD1Name = (name: string): boolean => PROTECTED_D1_NAMES.includes(name);

/** Exclusão e import de banco protegido: 403 SEMPRE, sem frase de override. */
export function assertD1DestructionAllowed(name: string): void {
  if (!isProtectedD1Name(name)) {
    return;
  }
  throw new ProtectedD1Error(
    `'${name}' é IMUTÁVEL e é o banco operacional do próprio admin-app — exclusão/import são bloqueados pela política do workspace (sem override).`,
  );
}

/** SQL de escrita em banco protegido exige confirmPhrase exata. */
export function assertD1WriteAllowed(name: string, confirmPhrase: unknown): void {
  if (!isProtectedD1Name(name)) {
    return;
  }
  if (confirmPhrase === PROTECTED_CONFIRM_PHRASE) {
    return;
  }
  throw new ProtectedD1Error(
    `'${name}' é o banco operacional do próprio admin-app (IMUTÁVEL — sem rename/rotação); SQL de escrita pode derrubar telemetria e módulos. Para prosseguir, envie confirmPhrase: '${PROTECTED_CONFIRM_PHRASE}'.`,
  );
}
