# Maestro AI Web: contrato de paridade comportamental com v0.5.56

## Baseline canônico

- Aplicativo de referência: `maestro-app` v0.5.56.
- Commit de referência: `eeb17e8aeef6af61397d2e78e7b15ce432977b1b`.
- Escopo web: módulo `admin-app/Maestro AI` e rotas
  `admin-motor/src/handlers/routes/maestro-ai`.
- Paridade significa equivalência das regras editoriais e das transições de
  estado. Não significa copiar detalhes de filesystem, subprocessos ou UI do
  aplicativo Windows.

## Invariantes obrigatórias

1. O redator escolhido inicia a primeira versão.
2. A revisão é serial. Cada agente recebe a versão sob custódia produzida pelo
   agente anterior.
3. Ninguém revisa a própria versão corrente. Um slot inelegível é
   automaticamente redesenhado entre revisores independentes elegíveis.
4. O redator inicial só volta a atuar depois do circuito dos demais pares e
   passa a revisar uma versão de autoria alheia.
5. Quem identifica um defeito corrigível deve corrigi-lo no mesmo turno e
   devolver o texto completo revisado. Não pode apenas transferir o problema ao
   próximo agente.
6. Blocos já aprovados ficam protegidos. Uma revisão só pode alterar os blocos
   declarados no relatório, com fundamento no protocolo editorial.
7. Uma revisão substantiva transfere a custódia, torna o revisor o novo autor e
   limpa todas as aprovações estáveis da versão anterior.
8. Um `READY` sem mudança substantiva acrescenta a aprovação independente do
   revisor à versão corrente.
9. Uma tentativa rejeitada por contrato, trava de conteúdo, auditoria de
   liberação ou proteção contra empobrecimento não altera custódia nem
   aprovações. O artefato continua disponível apenas como evidência append-only.
10. A convergência exige `READY` estável de todo agente elegível diferente do
    autor da versão corrente. O autor nunca vota sobre a própria versão.
11. A entrega final só ocorre após a auditoria bibliográfica e de links passar.
    Lacunas verificáveis devem ser corrigidas ou quarentenadas pelo revisor, não
    apenas apontadas.
12. Prompts e deliberação interna usam `en_US`; a entrega visível ao usuário usa
    `pt_BR`.

## Estado circular durável

`maestro_ai_sessions.circular_state_json` usa schema v2 e persiste:

- id da sessão;
- artefato e agente que detêm a custódia atual;
- SHA-256 do texto corrente;
- rodada, cursor e roster ordenado;
- agentes válidos na rodada;
- aprovações estáveis da versão corrente;
- maior turno aceito e ponteiro do último artefato da cadeia;
- instante da atualização.

Antes de retomar, o backend valida o JSON, ids, agentes, contadores, roster,
artefatos, autoria, texto e hash. Divergência pausa como
`paused_resume_state_invalid` antes de qualquer chamada paga.
O corpo é extraído pelo delimitador estrutural que sucede o bloco de link audit
e comparado integralmente: títulos `## Current Text` internos ao artigo são
preservados, enquanto uma linha D1 truncada que coincida apenas com a subseção
final do artefato é rejeitada.

## Migração e compatibilidade

- As colunas `cycle_lead` e `circular_state_json` são adicionadas por `ALTER
TABLE`; nenhuma coluna ou linha legada é removida.
- `max_cycles` permanece no schema e nas respostas antigas por compatibilidade,
  mas não encerra novas execuções. O limite operacional canônico é o teto de
  turnos do circuito, além dos limites financeiro e temporal.
- Sessões antigas sem estado v2 são reconstruídas somente quando o texto e o
  autor da linha D1 correspondem a um artefato de custódia aceito.
- Se não houver artefato algum, a migração cria um artefato de recuperação
  aditivo. Se houver artefatos contraditórios, a retomada falha fechada.
- Uma mudança de painel na retomada preserva custódia e aprovações ainda
  elegíveis, reinicia apenas o progresso local da rodada e usa o novo
  `cycle_lead`. `initial_agent` continua sendo o autor inicial histórico.

## Atomicidade e prevenção de perda

- Artefatos são sempre append-only.
- Texto, autor, hash, aprovações, cursor e evento de aceitação são promovidos no
  mesmo `UPDATE` condicional (`queued`/`running`).
- Se cancelamento ou outra transição terminal vencer o CAS, o estado aceito
  anterior permanece intacto. Um artefato já inserido fica órfão somente como
  evidência e seu número de turno não é reutilizado na retomada.
- O diário `events_json` só cresce por `json_insert`; o módulo não permite mais
  substituir o array inteiro. Um runner atrasado não pode apagar a ata de
  cancelamento.
- O custo conhecido é atualizado de forma monotônica logo após cada resposta de
  provedor. Cancelar após uma chamada paga não reduz nem oculta o gasto.
- Cada tentativa corretiva consome uma unidade do teto global de turnos. O
  limite `roster * 4` inclui a chamada inicial e todos os retries do mesmo
  revisor, impedindo que um único slot multiplique silenciosamente o custo.
- JSON malformado no diário não é zerado ou reformatado. A sessão pausa antes de
  chamadas pagas e preserva o valor bruto para perícia.
- A edição externa do texto de uma sessão retomável é bloqueada para impedir
  quebra de autoria, hash e cadeia de artefatos.

## Diferenças web aprovadas

- Provedores são chamados somente por API; não há CLI ou subprocesso.
- Estado e artefatos vivem na D1 `bigdata_db`, não em diretórios locais.
- Segredos vivem no Cloudflare Secrets Store e não são retornados pela API.
- O link audit usa sondagens paralelas limitadas e bloqueio SSRF reforçado para
  hosts internos do ambiente Worker.
- Resoluções de modelo e auditorias repetidas podem ser cacheadas apenas durante
  uma execução, sem alterar a decisão editorial persistida.

## Evidência local

- Orquestrador: 114 testes.
- Backend completo: 52 arquivos, 535 testes.
- Frontend completo: 54 arquivos, 363 testes.
- TypeScript frontend: sem erros.
- Typecheck do admin-motor: baseline limpo, 0/0 erros.
- ESLint, Biome e `git diff --check`: sem achados.
- As instruções SQL de append JSON e custo monotônico foram exercitadas também
  em SQLite real, além do mock D1.

## Validação independente

- Ultrabrain:
  `maestro-web-v00556-parity-closure-20260729`, validação estrita `valid`,
  qualidade média `100%`, zero vieses e zero questões pendentes.
- Cross Review v2:
  `deb6919e-82ac-4a9a-983c-fa19b0b49bd4`, `outcome=converged` e
  `outcome_reason=unanimous_ready`.
- Claude, Gemini, DeepSeek, Grok e Perplexity participaram do colegiado
  completo. Todos encerraram como `READY`, com qualidade `clean`, sem pares
  rejeitados, pulados ou pendentes.
- A sessão forense anterior
  `d3335f06-3895-4cbe-a5ec-92bf88228af0` foi preservada sem edição manual.
  Ela registrou o defeito de validação por citações transformadas e não é usada
  como substituto da convergência formal.
