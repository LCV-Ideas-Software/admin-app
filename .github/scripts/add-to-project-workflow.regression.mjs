import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// readFileSync segue symlink: um PR poderia trocar um arquivo protegido por um
// link para outro que contenha o texto aprovado — o teste passaria, mas o
// GitHub NAO carrega entradas symlinkadas sob .github/workflows, desativando a
// automacao em silencio. O_NOFOLLOW protege apenas o ULTIMO componente, entao
// cada diretorio ancestral e verificado antes (trocar .github por um link para
// a arvore confiavel faria as leituras compararem main consigo mesma). Os
// ancestrais sao checados por lstat e o arquivo e aberto com O_NOFOLLOW — sao
// caminhos distintos, sem check-then-use do mesmo alvo.
const lerRegular = (p) => {
  const partes = p.split('/');
  let ancestral = '';
  for (const parte of partes.slice(0, -1)) {
    ancestral = ancestral ? ancestral + '/' + parte : parte;
    const st = lstatSync(ancestral);
    if (st.isSymbolicLink() || !st.isDirectory())
      throw new Error(ancestral + ' must be a real directory, not a symlink');
  }
  const fd = openSync(p, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    if (!fstatSync(fd).isFile()) throw new Error(p + ' must be a regular file, not a symlink');
    return readFileSync(fd, 'utf8');
  } finally {
    closeSync(fd);
  }
};

const workflow = lerRegular('.github/workflows/add-to-project.yml');

// Normalizacao anti-evasao: YAML aceita a MESMA chave em varias grafias.
const normaliza = (s) => s.replace(/(["'])([\w-]+)\1(\s*:)/g, '$2$3');
const normalized = normaliza(workflow);

// Quadro dedicado DESTE repositorio — pinado; retargeting reprova.
const QUADRO = '13';

// O martelo: o workflow privilegiado precisa casar EXATAMENTE com o template
// aprovado — linha a linha, arquivo inteiro, quadro pinado. Qualquer input,
// passo, env, comentario ou grafia YAML fora do template reprova por construcao.
const ESPERADO = [
  'name: Add to project',
  '',
  '# Coloca toda issue e todo pull request nos quadros do repositorio e do portfolio.',
  '# Inerte enquanto a variavel LCV_PROJECTS_APP_CLIENT_ID nao estiver definida na organizacao.',
  '#',
  '# Pre-requisito (acao do operador): GitHub App da organizacao instalado neste repositorio.',
  '# O passo de mint abaixo solicita tres permissoes e o token NAO e emitido se a instalacao',
  '# nao conceder cada uma delas:',
  '#   - projects de organizacao: leitura e escrita (permissao de projects de repositorio nao basta)',
  '#   - issues: leitura',
  '#   - pull requests: leitura',
  '# Alem do App, precisam existir:',
  '#   - variavel de organizacao LCV_PROJECTS_APP_CLIENT_ID',
  "#   - secret LCV_PROJECTS_APP_PRIVATE_KEY no environment 'projects-automation' deste repo",
  '# GITHUB_TOKEN nao acessa Projects v2, por isso o App e obrigatorio.',
  '#',
  '# Backfill na ativacao (uma unica vez): definir a variavel NAO reprocessa eventos',
  '# passados — issues/PRs abertos enquanto o workflow esteve inerte nao entram nos quadros',
  '# por este gatilho. Ao ativar, adicionar aos dois quadros os itens abertos que ainda nao',
  '# estejam neles (addProjectV2ItemById), conforme checklist da issue de rastreamento desta',
  '# implantacao.',
  '#',
  '# Por que pull_request_target: em PR de fork o evento pull_request roda sem os secrets do',
  '# repositorio e o mint da chave do App falharia; pull_request_target roda no contexto da',
  '# base e alcanca o secret do environment. Essa e a cobertura que este gatilho garante.',
  '#',
  '# PR do Dependabot: cobertura NAO garantida por este gatilho. A documentacao publica nao',
  '# resolve o caso — afirma que "Your secrets are available in Dependabot secrets rather',
  '# than as GitHub Actions secrets" e, em outra pagina, que pull_request_target "does not',
  '# have these limitations", sem dizer qual secret store vale em pull_request_target',
  '# disparado pelo Dependabot. Portanto NAO se promete cobertura de Dependabot aqui: na',
  '# ativacao, um PR de Dependabot de teste decide empiricamente; se o mint falhar, a',
  '# cobertura desses PRs vem de reconciliacao por evento confiavel (workflow_run ou',
  '# agendado, sem executar codigo do PR), e nao deste gatilho.',
  '#',
  '# Segunda lacuna conhecida do gatilho, esta documentada pelo GitHub: "branches with names',
  '# that match certain patterns (such as those which look similar to SHAs) may not trigger',
  '# workflows with the pull_request_target event". PR aberto de um branch com nome parecido',
  '# com SHA pode simplesmente nao disparar este workflow. Vale a mesma saida do caso',
  '# Dependabot: reconciliacao por evento confiavel cobre o que o gatilho nao alcanca.',
  '#',
  '# Terceira lacuna declarada: item ja ARQUIVADO no quadro. O fix #797 transforma a',
  '# duplicata em skip (nao em falha), mas nao desarquiva: reabrir trabalho arquivado',
  '# nao o traz de volta a visao ativa. Desarquivar exigiria passo de execucao aqui',
  '# (proibido pelo invariante metadata-only) — cabe a reconciliacao/backfill.',
  '#',
  '# Em resumo, este gatilho garante PR de fork com nome de branch comum; Dependabot,',
  '# branch com cara de SHA e item arquivado sao lacunas conhecidas e declaradas.',
  '#',
  '# Este workflow usa somente metadados e NAO faz checkout nem executa codigo do PR —',
  '# invariante que mantem o gatilho privilegiado seguro e justifica a excecao estreita do',
  '# zizmor na linha do gatilho. Se algum passo futuro precisar de checkout, a excecao deixa',
  '# de valer e o gatilho volta a pull_request.',
  '',
  'on:',
  '  issues:',
  '    # transferred cobre a issue transferida PARA este repositorio: o README da action',
  '    # pinada lista o evento como o caminho suportado para "Issues... transferred into',
  '    # your repository". A mutacao addProjectV2ItemById e idempotente para item ativo',
  '    # (re-adicionar devolve o mesmo item; provado por sonda), e o pin inclui o fix',
  '    # upstream #797: duplicata que a API rejeitaria (ex.: item arquivado) vira skip',
  '    # com aviso, nao falha do run — essencial para reopened/ready_for_review.',
  '    types: [opened, reopened, transferred]',
  '  pull_request_target: # zizmor: ignore[dangerous-triggers] -- sem checkout e sem execucao de codigo do PR; somente metadados; secret do environment para PR de fork (cobertura de Dependabot nao garantida: decidida por sonda na ativacao)',
  '    types: [opened, reopened, ready_for_review]',
  '',
  '# Scorecard TokenPermissions exige um bloco permissions em escopo de workflow; a politica',
  '# enterprise revogou write-all (Discussion .github#150, 11/08/2026). Nenhum passo deste',
  '# workflow usa o GITHUB_TOKEN — o token do App e emitido e repassado explicitamente —,',
  '# entao o conjunto vazio e o privilegio minimo real.',
  'permissions: {}',
  '',
  'env:',
  '  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "true"',
  '',
  'concurrency:',
  '  group: add-to-project-${{ github.event.issue.number || github.event.pull_request.number }}',
  '  cancel-in-progress: false',
  '',
  'jobs:',
  '  add:',
  '    name: Add item to projects',
  '    # Dependabot fica fora da cobertura deste gatilho (declarado acima); sem esta',
  '    # guarda, apos a ativacao cada PR dele falharia no mint e viraria ruido vermelho.',
  '    # A guarda olha o AUTOR do PR (nao o ator): reopen por mantenedor mantem o autor',
  '    # dependabot[bot]. Em evento de issue o campo e nulo e a guarda nao interfere.',
  "    if: ${{ vars.LCV_PROJECTS_APP_CLIENT_ID != '' && github.event.pull_request.user.login != 'dependabot[bot]' }}",
  '    runs-on: ubuntu-latest',
  '    timeout-minutes: 10',
  '    permissions: {}',
  '    # Confina a chave privada do App a este job (zizmor secrets-outside-env).',
  '    # Mesmo padrao ja usado pela organizacao para credenciais de automacao.',
  '    # deployment: false — usa os secrets do environment sem criar um deployment',
  '    # object por evento de issue/PR (senao cada evento polui o historico de',
  '    # deployments e aciona integracoes de deployment).',
  '    environment:',
  '      name: projects-automation',
  '      deployment: false',
  '    steps:',
  '      - name: Mint installation token',
  '        id: token',
  '        uses: actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1 # v3.2.0',
  '        env:',
  '          # zizmor secrets-outside-env: segredo so pode ser referenciado via env',
  '          APP_PRIVATE_KEY: ${{ secrets.LCV_PROJECTS_APP_PRIVATE_KEY }}',
  '        with:',
  '          client-id: ${{ vars.LCV_PROJECTS_APP_CLIENT_ID }}',
  '          private-key: ${{ env.APP_PRIVATE_KEY }}',
  '          owner: ${{ github.repository_owner }}',
  '          # zizmor github-app: token restrito a este repositorio e as permissoes minimas',
  '          repositories: ${{ github.event.repository.name }}',
  '          permission-organization-projects: write',
  '          permission-issues: read',
  '          permission-pull-requests: read',
  '',
  '      - name: Add to repository project',
  '        uses: actions/add-to-project@c7c85ddefbcfcea7da1845330fbc20fd7033d6f6 # v2.0.0 + fix #797 (item ja existente vira skip, nao erro)',
  '        with:',
  '          project-url: https://github.com/orgs/LCV-Ideas-Software/projects/__QUADRO__',
  '          github-token: ${{ steps.token.outputs.token }}',
  '',
  '      - name: Add to portfolio project',
  '        uses: actions/add-to-project@c7c85ddefbcfcea7da1845330fbc20fd7033d6f6 # v2.0.0 + fix #797 (item ja existente vira skip, nao erro)',
  '        with:',
  '          project-url: https://github.com/orgs/LCV-Ideas-Software/projects/17',
  '          github-token: ${{ steps.token.outputs.token }}',
].join('\n');
const template = new RegExp(
  '^' + ESPERADO.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('__QUADRO__', QUADRO) + '\\n$',
);

test('the privileged projects workflow matches its approved template exactly', () => {
  assert.match(workflow, template);
});

// Cinturao (documenta a intencao e sobrevive a evolucao do template):
test('the privileged projects workflow never executes PR-controlled code', () => {
  assert.match(workflow, /pull_request_target: # zizmor: ignore\[dangerous-triggers\]/);
  assert.doesNotMatch(normalized, /\brun\s*:/);
  assert.doesNotMatch(normalized, /actions\/checkout|actions\/cache/);
  assert.doesNotMatch(normalized, /download-artifact|upload-artifact/);
  assert.doesNotMatch(normalized, /continue-on-error/);
  assert.doesNotMatch(normalized, /uses\s*:\s*\.\//);
  assert.doesNotMatch(normalized, /\bcontainer\s*:/);
  assert.doesNotMatch(normalized, /\bservices\s*:/);
  assert.doesNotMatch(normalized, /NODE_OPTIONS/i);
  const envKeys = [...normalized.matchAll(/^\s*([A-Z][A-Z0-9_]+)\s*:/gm)].map((m) => m[1]);
  assert.deepEqual(envKeys, ['FORCE_JAVASCRIPT_ACTIONS_TO_NODE24', 'APP_PRIVATE_KEY']);
});

test('the projects workflow bans YAML mechanics that could disguise a key', () => {
  assert.doesNotMatch(workflow, /\\/);
  // & isolado = ancora YAML (banida); && = operador de expressao (permitido)
  assert.doesNotMatch(workflow, /(?<!&)&(?!&)/);
  assert.doesNotMatch(workflow, /\*/);
  assert.doesNotMatch(workflow, /\?/);
  assert.doesNotMatch(workflow, /^\s*<</m);
  assert.doesNotMatch(workflow, /!![A-Za-z]/);
  assert.doesNotMatch(workflow, /^%/m);
});

test('the projects workflow uses exactly the two pinned metadata actions', () => {
  const uses = [...normalized.matchAll(/uses\s*:\s*["']?([^\s,"'}\]]+)/g)].map((m) => m[1]);
  assert.deepEqual(uses, [
    'actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1',
    'actions/add-to-project@c7c85ddefbcfcea7da1845330fbc20fd7033d6f6',
    'actions/add-to-project@c7c85ddefbcfcea7da1845330fbc20fd7033d6f6',
  ]);
});

test('inbound transfers stay covered, per the pinned action contract', () => {
  assert.match(workflow, /types: \[opened, reopened, transferred\]/);
});

const carrier = lerRegular('.github/workflows/dependency-review.yml');
const carrierNorm = normaliza(carrier);

// Predicados canonicos do agregador — a UNICA forma aceita neste repositorio,
// em bloco contiguo com a propria linha "if: >-" (comentario nao falsifica).
const REJECT_CANON = [
  '        if: >-',
  '          ${{',
  "            needs.projects_workflow_boundaries.result != 'success' ||",
  '            (',
  '              (',
  "                github.event_name == 'merge_group' ||",
  '                github.event.pull_request.head.repo.full_name == github.repository',
  '              ) &&',
  '              (',
  "                needs.workflow_boundaries.result != 'success' ||",
  "                needs.candidate_review.result != 'success'",
  '              )',
  '            )',
  '          }}',
].join('\n');
const PRESERVE_CANON = [
  '        if: >-',
  '          ${{',
  "            github.event_name != 'merge_group' &&",
  "            needs.projects_workflow_boundaries.result == 'success' &&",
  '            (',
  '              github.event.pull_request.head.repo.full_name != github.repository ||',
  '              (',
  "                needs.workflow_boundaries.result == 'success' &&",
  "                needs.candidate_review.result == 'success'",
  '              )',
  '            )',
  '          }}',
].join('\n');
const ENFORCE_CANON = [
  '        if: >-',
  '          ${{',
  "            github.event_name == 'merge_group' &&",
  "            needs.workflow_boundaries.result == 'success' &&",
  "            needs.candidate_review.result == 'success' &&",
  "            needs.projects_workflow_boundaries.result == 'success'",
  '          }}',
].join('\n');

// Bloco canonico INTEIRO do job de boundary: igualdade exata — sufixos de shell
// ("|| true"), inputs extras no checkout, troca de comando, tudo reprova.
const CANON_BOUNDARY = [
  '  projects_workflow_boundaries:',
  '    name: Projects workflow boundaries',
  '    # Sem gate de origem: a assercao do invariante privilegiado roda para TODO PR,',
  '    # inclusive de fork (evento sem secrets), e tambem no merge_group.',
  '    runs-on: ubuntu-latest',
  '    timeout-minutes: 10',
  '    permissions:',
  '      contents: read',
  '    steps:',
  '      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1',
  '        with:',
  '          persist-credentials: false',
  '      # O verificador NAO pode vir apenas da arvore do candidato: um PR que altere',
  '      # o workflow privilegiado E o proprio verificador se auto-aprovaria. A copia',
  '      # confiavel vem do ref base protegido (main). Bootstrap: enquanto main ainda',
  '      # nao contiver o verificador (este PR o introduz), usa-se a copia do',
  '      # candidato — desvio que morre no primeiro merge.',
  '      # Destinacao limpa e nao-symlinkada: um .trusted-boundary pre-colocado pelo',
  '      # candidato como symlink faria o checkout de main seguir o link e sobrescrever',
  '      # a arvore do candidato. rm -rf sobre um symlink desfaz o link, nao o alvo.',
  '      - name: Ensure a clean, non-symlinked trusted destination',
  '        run: rm -rf .trusted-boundary',
  '      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1',
  '        with:',
  '          persist-credentials: false',
  '          ref: main',
  '          path: .trusted-boundary',
  '      - name: Test projects automation workflow boundaries',
  '        run: |',
  '          if [ -L .trusted-boundary ]; then',
  '            echo "::error::.trusted-boundary must be a real directory, not a symlink"',
  '            exit 1',
  '          fi',
  '          verificador=".github/scripts/add-to-project-workflow.regression.mjs"',
  '          confiavel=".trusted-boundary/${verificador}"',
  '          if [ -f "${confiavel}" ]; then',
  '            node --test "${confiavel}"',
  '          else',
  '            echo "Bootstrap: verificador ausente em main; usando a copia do candidato."',
  '            node --test "${verificador}"',
  '          fi',
].join('\n');

// Cabecalho canonico do carrier (inicio -> jobs:): congela triggers (nada de
// paths-ignore), permissions de workflow e concurrency, e impede env:/defaults:
// de nivel de workflow — NODE_OPTIONS/BASH_ENV/shell poisoning do contexto que
// executa o proprio verificador confiavel.
const CANON_HEAD = [
  'name: Dependency Review',
  'on:',
  '  pull_request:',
  '    branches:',
  '      - main',
  '  merge_group:',
  '    types:',
  '      - checks_requested',
  '# Politica enterprise (.github#150): sem write-all. Conjunto vazio no escopo do',
  '# workflow e grant minimo declarado em cada job.',
  'permissions: {}',
  'concurrency:',
  '  group: dependency-review-${{ github.ref }}',
  '  cancel-in-progress: true',
  'jobs:',
].join('\n');

// Job do agregador INTEIRO: igualdade exata — defaults.run.shell, passos extras
// ou qualquer contrabando dentro do job reprovam por construcao.
const CANON_AGG = [
  '  dependency_review:',
  '    # write-all HISTORICO exigido pelo gate de merge-group do native-auto-merge',
  '    # (componente em aposentadoria pela C2, .github#147): o conjunto escopado de',
  '    # reads quebrou o gate em producao (admin-app, run 31806593048, "Resource not',
  '    # accessible by integration" no mergeQueue) e o dump do token prova que NAO',
  '    # existe permissao MergeQueues para conceder individualmente. Volta ao minimo',
  '    # (contents: read) junto com a remocao do gate pela C2.',
  '    permissions: write-all',
  '    name: Dependency Review',
  '    # Job exigido que fica skipped conta como aprovado para o ruleset; por isso',
  '    # o agregador roda para TODA origem (sem gate proprio) e decide por resultado:',
  '    # o invariante projects_workflow_boundaries e exigido incondicionalmente e os',
  '    # jobs com gate de origem so sao exigidos quando a origem os executa.',
  '    if: ${{ always() }}',
  '    needs:',
  '      - workflow_boundaries',
  '      - candidate_review',
  '      - projects_workflow_boundaries',
  '    runs-on: ubuntu-latest',
  '    timeout-minutes: 30',
  '    steps:',
  '      - name: Reject unsuccessful dependency review prerequisite',
  '        if: >-',
  '          ${{',
  "            needs.projects_workflow_boundaries.result != 'success' ||",
  '            (',
  '              (',
  "                github.event_name == 'merge_group' ||",
  '                github.event.pull_request.head.repo.full_name == github.repository',
  '              ) &&',
  '              (',
  "                needs.workflow_boundaries.result != 'success' ||",
  "                needs.candidate_review.result != 'success'",
  '              )',
  '            )',
  '          }}',
  '        run: exit 1',
  '',
  '      - name: Preserve the required dependency review context',
  '        if: >-',
  '          ${{',
  "            github.event_name != 'merge_group' &&",
  "            needs.projects_workflow_boundaries.result == 'success' &&",
  '            (',
  '              github.event.pull_request.head.repo.full_name != github.repository ||',
  '              (',
  "                needs.workflow_boundaries.result == 'success' &&",
  "                needs.candidate_review.result == 'success'",
  '              )',
  '            )',
  '          }}',
  '        run: echo "Dependency review candidate passed."',
  '',
  '      - name: Enforce merge-group feedback gate',
  '        if: >-',
  '          ${{',
  "            github.event_name == 'merge_group' &&",
  "            needs.workflow_boundaries.result == 'success' &&",
  "            needs.candidate_review.result == 'success' &&",
  "            needs.projects_workflow_boundaries.result == 'success'",
  '          }}',
  '        uses: LCV-Ideas-Software/.github/native-auto-merge@231cd33f27c260a6b01fec26aa1d0eb606e1ee2d # native-auto-merge/v2.1.4',
  '        with:',
  '          operation: merge-group-feedback-gate',
  '          github_token: ${{ github.token }}',
  '          event_repository: ${{ github.event.repository.full_name }}',
  '          event_action: ${{ github.event.action }}',
  '          merge_group_head_sha: ${{ github.event.merge_group.head_sha }}',
  '          merge_group_base_sha: ${{ github.event.merge_group.base_sha }}',
  '          merge_group_base_ref: ${{ github.event.merge_group.base_ref }}',
  '          merge_group_head_ref: ${{ github.event.merge_group.head_ref }}',
  '',
].join('\n');

test('the boundary job feeds the required aggregator for every origin', () => {
  assert.ok(
    carrierNorm.startsWith(CANON_HEAD),
    'carrier head (triggers/permissions/concurrency, no workflow-level env or defaults) must equal its canonical block',
  );
  const inicioBoundary = carrierNorm.indexOf('  projects_workflow_boundaries:');
  assert.ok(inicioBoundary >= 0, 'boundary job missing');
  assert.equal(
    carrierNorm.slice(inicioBoundary).trimEnd(),
    CANON_BOUNDARY.trimEnd(),
    'boundary job must equal its canonical block exactly',
  );
  const agregador = carrierNorm.slice(carrierNorm.indexOf('  dependency_review:'), inicioBoundary);
  assert.equal(agregador.trimEnd(), CANON_AGG.trimEnd(), 'aggregator job must equal its canonical block exactly');
  assert.match(agregador, /^ {4}if: \$\{\{ always\(\) \}\}$/m);
  assert.doesNotMatch(agregador, /continue-on-error/);
  assert.match(agregador, /needs:[\s\S]{0,200}- projects_workflow_boundaries/);
  const passos = agregador.split(/^ {6}- name: /m).slice(1);
  const casos = [
    ['Reject', REJECT_CANON],
    ['Preserve', PRESERVE_CANON],
    ['Enforce', ENFORCE_CANON],
  ];
  for (const [prefixo, canon] of casos) {
    const passo = passos.find((p) => p.startsWith(prefixo));
    assert.ok(passo, prefixo + ' step missing');
    const ifs = passo.match(/\bif\s*:/g) || [];
    assert.equal(ifs.length, 1, prefixo + ' step must have exactly one if');
    assert.ok(passo.includes(canon), prefixo + ' predicate is not canonical');
  }
  const reject = passos.find((p) => p.startsWith('Reject'));
  assert.match(reject, /^ {8}run: exit 1$/m, 'reject step must actually fail');
});

// Rotacao do verificador — DEFESA EM PROFUNDIDADE, NAO PROVA.
//
// Se a copia candidata diferir do verificador confiavel, o confiavel executa o
// candidato contra o par legitimo e contra mutantes conhecidos. Isso mata a
// rotacao trivialmente vazia (no-op), e so isso. Um corpus finito de mutantes
// NAO estabelece equivalencia semantica contra entrada adversarial: um
// candidato malicioso pode reconhecer estas fixtures (ou o diretorio temporario)
// e aceitar todo o resto. Byte-igualdade tambem nao serve — cria deadlock
// permanente de rotacao, porque o check exigido nunca mais fica verde.
//
// O gate REAL da rotacao e humano e fica fora do candidato: CODEOWNERS marca
// .github/scripts/ e .github/workflows/ como propriedade do operador, e a
// aprovacao obrigatoria de code owner (ruleset) e a admissao na merge queue — quando exigidas no ruleset (pedido em .github#147) — sao
// o que efetivamente autoriza trocar este arquivo.
test('a candidate verifier rotation keeps killing the known mutants', () => {
  const self = readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const candidato = lerRegular('.github/scripts/add-to-project-workflow.regression.mjs');
  if (candidato === self) return;

  const raiz = mkdtempSync(join(tmpdir(), 'rotacao-'));
  const escreve = (wfTexto, carrierTexto) => {
    const base = mkdtempSync(join(raiz, 'caso-'));
    mkdirSync(join(base, '.github', 'workflows'), { recursive: true });
    mkdirSync(join(base, '.github', 'scripts'), { recursive: true });
    writeFileSync(join(base, '.github', 'workflows', 'add-to-project.yml'), wfTexto);
    writeFileSync(join(base, '.github', 'workflows', 'dependency-review.yml'), carrierTexto);
    writeFileSync(join(base, '.github', 'scripts', 'add-to-project-workflow.regression.mjs'), candidato);
    return base;
  };
  // O filho NAO pode herdar o contexto do test runner: com NODE_TEST_CONTEXT
  // herdado, o node --test aninhado reporta como subteste e devolve exit 0
  // mesmo com falhas — o que faria todo mutante "passar" em silencio.
  const envLimpo = { ...process.env };
  delete envLimpo.NODE_TEST_CONTEXT;
  delete envLimpo.NODE_OPTIONS;
  const roda = (base) => {
    try {
      execFileSync(process.execPath, ['--test', '.github/scripts/add-to-project-workflow.regression.mjs'], {
        cwd: base,
        encoding: 'utf8',
        stdio: 'pipe',
        env: envLimpo,
      });
      return true;
    } catch {
      return false;
    }
  };

  // O par atual ja foi validado pelos testes acima deste mesmo verificador
  // confiavel, entao serve de caso positivo para o candidato.
  assert.ok(roda(escreve(workflow, carrier)), 'candidate verifier must accept the current, already-validated pair');

  const mutantes = [
    ['passo run', workflow.replace('    steps:', '    steps:\n      - { run: echo pwned }'), carrier],
    [
      'input extra na action de mint',
      workflow.replace('          owner:', '          github-api-url: https://attacker.example\n          owner:'),
      carrier,
    ],
    ['quadro do repositorio trocado', workflow.replace('/projects/' + QUADRO + '\n', '/projects/999999\n'), carrier],
    ['boundary fora do needs', workflow, carrier.replace('\n      - projects_workflow_boundaries', '')],
    ['reject que nao falha', workflow, carrier.replace('        run: exit 1', '        run: exit 0')],
  ];
  for (const [nome, wfM, caM] of mutantes) {
    assert.ok(wfM !== workflow || caM !== carrier, 'mutant not applied: ' + nome);
    assert.ok(!roda(escreve(wfM, caM)), 'candidate verifier must reject the mutant: ' + nome);
  }
});
