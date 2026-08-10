import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Keep this outside Vitest's *.test.* discovery; CI invokes Node's runner directly.

const NATIVE_REF =
  'LCV-Ideas-Software/.github/native-auto-merge@231cd33f27c260a6b01fec26aa1d0eb606e1ee2d # native-auto-merge/v2.1.4';
const ZIZMOR_REF =
  'LCV-Ideas-Software/.github/.github/workflows/zizmor.yml@4058fad11eca7c2eb4e9296108667ef6199a6356 # zizmor/v2.0.0';
const CODEQL_SARIF_REF =
  'LCV-Ideas-Software/.github/codeql-sarif-gate@24b0bcc09a48b47f740b8a8bd972374f7289e48e # codeql-sarif-gate/v1.0.0';

const [native, dependencyReview, zizmorConfig, zizmorWorkflow, codeqlWorkflow] = await Promise.all([
  readFile(new URL('../workflows/native-auto-merge.yml', import.meta.url), 'utf8'),
  readFile(new URL('../workflows/dependency-review.yml', import.meta.url), 'utf8'),
  readFile(new URL('../zizmor.yml', import.meta.url), 'utf8'),
  readFile(new URL('../workflows/zizmor.yml', import.meta.url), 'utf8'),
  readFile(new URL('../workflows/codeql.yml', import.meta.url), 'utf8'),
]);

function topLevelBody(workflow, key) {
  const lines = workflow.split(/\r?\n/);
  const start = lines.indexOf(`${key}:`);
  assert.notEqual(start, -1, `${key} must be present`);
  const relativeEnd = lines.slice(start + 1).findIndex((line) => /^[A-Za-z0-9_-]+:/.test(line));
  const end = relativeEnd === -1 ? lines.length : start + 1 + relativeEnd;
  return lines.slice(start + 1, end).join('\n');
}

function jobBody(workflow, jobName) {
  const lines = workflow.split(/\r?\n/);
  const start = lines.indexOf(`  ${jobName}:`);
  assert.notEqual(start, -1, `${jobName} job must be present`);
  const relativeEnd = lines.slice(start + 1).findIndex((line) => /^  [A-Za-z0-9_-]+:\s*$/.test(line));
  const end = relativeEnd === -1 ? lines.length : start + 1 + relativeEnd;
  return lines.slice(start + 1, end).join('\n');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertExactExpression(body, input, expression) {
  assert.match(
    body,
    new RegExp(`\\n\\s+${escapeRegex(input)}: \\$\\{\\{ ${escapeRegex(expression)} \\}\\}`),
    `${input} must bind exactly to ${expression}`,
  );
}

test('the trusted controller exposes both pinned v2.1.4 wake-up paths', () => {
  const events = topLevelBody(native, 'on');
  const enable = jobBody(native, 'enable');

  assert.match(events, /workflow_run:[\s\S]*workflows:[\s\S]*- CodeQL/);
  assert.match(events, /pull_request_target:[\s\S]*- review_requested/);
  assert.match(topLevelBody(native, 'concurrency'), /github\.event\.workflow_run\.id \|\| github\.run_id/);
  assert.match(enable, /timeout-minutes: 30/);
  assert.equal((native.match(new RegExp(NATIVE_REF.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length, 2);
  assert.match(enable, /github\.event\.requested_reviewer\.id == 175728472/);
  assert.match(enable, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);

  for (const [input, expression] of Object.entries({
    workflow_name: 'github.event.workflow_run.name',
    workflow_path: 'github.event.workflow_run.path',
    workflow_display_title: 'github.event.workflow_run.display_title',
    workflow_status: 'github.event.workflow_run.status',
    workflow_event: 'github.event.workflow_run.event',
    workflow_head_sha: 'github.event.workflow_run.head_sha',
    workflow_actor_id: 'github.event.workflow_run.actor.id',
    workflow_pull_requests: 'toJSON(github.event.workflow_run.pull_requests)',
    event_action: 'github.event.action',
    pull_number: 'github.event.pull_request.number',
    pull_head_sha: 'github.event.pull_request.head.sha',
    pull_head_repository: 'github.event.pull_request.head.repo.full_name',
    pull_base_ref: 'github.event.pull_request.base.ref',
    requested_reviewer_id: 'github.event.requested_reviewer.id',
    trigger_run_id: 'github.run_id',
  })) {
    assertExactExpression(enable, input, expression);
  }

  assert.doesNotMatch(
    native,
    /actions\/checkout|download-artifact|actions\/cache|github_token:|continue-on-error:|uses:\s*\.\/|merge-group-feedback-gate/,
  );
});

test('the existing Dependency Review context becomes the clean merge-group gate', () => {
  const boundaries = jobBody(dependencyReview, 'workflow_boundaries');
  const candidate = jobBody(dependencyReview, 'candidate_review');
  const required = jobBody(dependencyReview, 'dependency_review');

  assert.match(topLevelBody(dependencyReview, 'on'), /merge_group:[\s\S]*checks_requested/);
  assert.match(boundaries, /permissions:[\s\S]*contents: read/);
  assert.doesNotMatch(boundaries, /write-all/);
  assert.match(
    boundaries,
    /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1[\s\S]*persist-credentials: false/,
  );
  assert.match(boundaries, /node --test \.github\/scripts\/native-auto-merge-workflows\.regression\.mjs/);
  assert.match(candidate, /name: Dependency Review candidate/);
  assert.match(candidate, /actions\/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294/);
  assert.doesNotMatch(candidate, /node --test \.github\/scripts\/native-auto-merge-workflows\.regression\.mjs/);
  assert.match(required, /^ {4}name: Dependency Review$/m);
  assert.match(required, /always\(\)/);
  assert.match(
    required,
    /github\.event_name == 'merge_group'[\s\S]*github\.event\.pull_request\.head\.repo\.full_name == github\.repository/,
  );
  assert.match(required, /needs:[\s\S]*- workflow_boundaries[\s\S]*- candidate_review/);
  assert.match(required, /timeout-minutes: 30/);
  assert.match(
    required,
    /needs\.workflow_boundaries\.result != 'success'[\s\S]*needs\.candidate_review\.result != 'success'[\s\S]*run: exit 1/,
  );
  assert.ok((required.match(/needs\.workflow_boundaries\.result == 'success'/g) ?? []).length >= 2);
  assert.ok((required.match(/needs\.candidate_review\.result == 'success'/g) ?? []).length >= 2);
  assert.match(required, /operation: merge-group-feedback-gate/);
  assert.match(required, /github_token: \$\{\{ github\.token \}\}/);
  for (const [input, expression] of Object.entries({
    event_repository: 'github.event.repository.full_name',
    event_action: 'github.event.action',
    merge_group_head_sha: 'github.event.merge_group.head_sha',
    merge_group_base_sha: 'github.event.merge_group.base_sha',
    merge_group_base_ref: 'github.event.merge_group.base_ref',
    merge_group_head_ref: 'github.event.merge_group.head_ref',
  })) {
    assertExactExpression(required, input, expression);
  }
  assert.match(required, new RegExp(NATIVE_REF.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(
    required,
    /actions\/checkout|download-artifact|actions\/cache|automation_token:|continue-on-error:|secrets\.|uses:\s*\.\//,
  );
});

test('the privileged-trigger exception documents both trusted paths', () => {
  assert.match(zizmorConfig, /workflow_run and pull_request_target jobs/);
  assert.match(zizmorConfig, /never check out or\s*#\s*execute pull-request content/);
});

test('internal reusable Actions identify their component release families', () => {
  assert.match(zizmorWorkflow, new RegExp(ZIZMOR_REF.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(codeqlWorkflow, new RegExp(CODEQL_SARIF_REF.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});
