// Módulo: admin-motor/src/handlers/_shared/deadlines.ts
// Orçamento de tempo compartilhado pelos handlers que chamam IA.
//
// O proxy do Cloudflare Pages devolve 524 quando a função passa de ~100s, e
// nesse ponto o cliente recebe HTML de erro no lugar do JSON do handler. Cada
// rota fixa UM instante-limite no início e reparte o que sobra entre suas
// etapas; nenhuma tentativa individual pode reiniciar o relógio, senão dois
// retries de 80s somados ao countTokens já estouram o teto.

/** Teto por request, com margem para serialização da resposta antes do 524. */
export const PROXY_REQUEST_BUDGET_MS = 95_000;

/** Milissegundos restantes até o instante-limite (nunca negativo). */
export const msUntil = (deadlineAt: number): number => Math.max(0, deadlineAt - Date.now());

/** Recorte de uma etapa: o menor entre o teto próprio dela e o que resta. */
export const stageBudget = (deadlineAt: number, stageCeilingMs: number): number =>
  Math.min(stageCeilingMs, msUntil(deadlineAt));
