#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const LOCKFILE_PATH = ".github/workflows/actions.lock";
const WORKFLOWS_DIRECTORY = ".github/workflows";
const SUPPORTED_LOCKFILE_VERSION = "v0.0.2";
const FULL_COMMIT_SHA = /^[0-9a-f]{40}$/i;
const ACTION_REPOSITORY_COMPONENT = /^[A-Za-z0-9_.-]+$/;
const ACTION_SUBPATH_COMPONENT = /^[^@\s/]+$/;

function diagnostic(file, line, message) {
  return { file, line, message };
}

function parseScalar(raw, file, line, diagnostics) {
  const value = raw.trim();
  if (value.startsWith("'")) {
    const match = value.match(/^'((?:[^']|'')*)'\s*(?:#.*)?$/);
    if (!match) {
      diagnostics.push(diagnostic(file, line, "invalid single-quoted YAML scalar"));
      return null;
    }
    return match[1].replaceAll("''", "'");
  }

  if (value.startsWith('"')) {
    const match = value.match(/^("(?:[^"\\]|\\.)*")\s*(?:#.*)?$/);
    if (!match) {
      diagnostics.push(diagnostic(file, line, "invalid double-quoted YAML scalar"));
      return null;
    }
    try {
      return JSON.parse(match[1]);
    } catch {
      diagnostics.push(diagnostic(file, line, "invalid escape in double-quoted YAML scalar"));
      return null;
    }
  }

  const unquoted = value.replace(/\s+#.*$/, "").trim();
  if (!unquoted || /[\[\]{},&*!|>%`]/.test(unquoted)) {
    diagnostics.push(diagnostic(file, line, "ambiguous or unsupported unquoted YAML scalar"));
    return null;
  }
  return unquoted;
}

function parsePin(raw, file, line, diagnostics) {
  const separator = raw.lastIndexOf("@");
  const actionPath = separator > 0 ? raw.slice(0, separator) : "";
  const reference = separator > 0 ? raw.slice(separator + 1) : "";
  const components = actionPath.split("/");
  const validPath =
    raw.indexOf("@") === separator &&
    components.length >= 2 &&
    ACTION_REPOSITORY_COMPONENT.test(components[0]) &&
    ACTION_REPOSITORY_COMPONENT.test(components[1]) &&
    components.slice(2).every((component) => ACTION_SUBPATH_COMPONENT.test(component)) &&
    reference.length > 0 &&
    !/\s/.test(reference);

  if (!validPath) {
    diagnostics.push(diagnostic(file, line, `invalid action pin ${JSON.stringify(raw)}`));
    return null;
  }

  const sha = reference;
  if (!FULL_COMMIT_SHA.test(sha)) {
    diagnostics.push(
      diagnostic(
        file,
        line,
        `action pin ${JSON.stringify(raw)} uses a symbolic ref; expected a full commit SHA`,
      ),
    );
    return null;
  }

  return {
    canonical: `${components[0].toLowerCase()}/${components[1].toLowerCase()}@${sha.toLowerCase()}`,
    sha: sha.toLowerCase(),
  };
}

function parseKeyLine(trimmed, file, line, diagnostics) {
  const match = trimmed.match(/^(.+):$/);
  if (!match) {
    diagnostics.push(diagnostic(file, line, "expected a YAML mapping key"));
    return null;
  }
  return parseScalar(match[1], file, line, diagnostics);
}

/**
 * Parse the deterministic actions.lock format without accepting YAML features
 * that could make a security decision ambiguous. The official gh-actions-lock
 * verifier remains authoritative for dependency resolution; this parser adds
 * the structural guarantees that its v0.1.6 local verifier does not enforce.
 */
export function validateLockfileText(text, file = LOCKFILE_PATH) {
  const diagnostics = [];
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  const workflows = new Map();
  const dependencies = new Map();
  let version = null;
  let section = null;
  let currentWorkflow = null;
  let currentDependency = null;
  let inDependencyUses = false;

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const raw = lines[index];
    if (raw.includes("\t")) {
      diagnostics.push(diagnostic(file, lineNumber, "tabs are not allowed in actions.lock"));
      continue;
    }
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue;

    const indent = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();

    if (indent === 0) {
      currentWorkflow = null;
      currentDependency = null;
      inDependencyUses = false;

      if (trimmed.startsWith("version:")) {
        if (version !== null) {
          diagnostics.push(diagnostic(file, lineNumber, "duplicate lockfile version"));
          continue;
        }
        version = parseScalar(trimmed.slice("version:".length), file, lineNumber, diagnostics);
        section = null;
      } else if (trimmed === "workflows:") {
        if (workflows.size > 0 || section === "workflows") {
          diagnostics.push(diagnostic(file, lineNumber, "duplicate workflows section"));
        }
        section = "workflows";
      } else if (trimmed === "dependencies:") {
        if (dependencies.size > 0 || section === "dependencies") {
          diagnostics.push(diagnostic(file, lineNumber, "duplicate dependencies section"));
        }
        section = "dependencies";
      } else {
        diagnostics.push(diagnostic(file, lineNumber, `unsupported top-level entry ${JSON.stringify(trimmed)}`));
        section = null;
      }
      continue;
    }

    if (section === "workflows") {
      if (indent === 4) {
        const workflow = parseKeyLine(trimmed, file, lineNumber, diagnostics);
        currentWorkflow = workflow;
        if (workflow !== null) {
          if (!/^\.github\/workflows\/[^/]+\.ya?ml$/.test(workflow)) {
            diagnostics.push(diagnostic(file, lineNumber, `invalid workflow path ${JSON.stringify(workflow)}`));
          }
          if (workflows.has(workflow)) {
            diagnostics.push(diagnostic(file, lineNumber, `duplicate workflow entry ${JSON.stringify(workflow)}`));
          } else {
            workflows.set(workflow, []);
          }
        }
      } else if (indent === 8 && trimmed.startsWith("- ") && currentWorkflow !== null) {
        const rawPin = parseScalar(trimmed.slice(2), file, lineNumber, diagnostics);
        if (rawPin !== null) {
          const pin = parsePin(rawPin, file, lineNumber, diagnostics);
          if (pin) workflows.get(currentWorkflow)?.push({ ...pin, line: lineNumber, raw: rawPin });
        }
      } else {
        diagnostics.push(diagnostic(file, lineNumber, "invalid indentation or entry in workflows section"));
      }
      continue;
    }

    if (section === "dependencies") {
      if (indent === 4) {
        const rawPin = parseKeyLine(trimmed, file, lineNumber, diagnostics);
        currentDependency = rawPin;
        inDependencyUses = false;
        if (rawPin !== null) {
          const pin = parsePin(rawPin, file, lineNumber, diagnostics);
          if (pin) {
            if (dependencies.has(pin.canonical)) {
              diagnostics.push(diagnostic(file, lineNumber, `duplicate dependency ${JSON.stringify(rawPin)}`));
            } else {
              dependencies.set(pin.canonical, {
                ...pin,
                raw: rawPin,
                line: lineNumber,
                fields: new Map(),
                commit: null,
                uses: [],
              });
            }
          }
        }
      } else if (indent === 8 && currentDependency !== null) {
        const parsedDependency = parsePin(currentDependency, file, lineNumber, []);
        const dependency = parsedDependency ? dependencies.get(parsedDependency.canonical) : null;
        if (trimmed === "uses:") {
          inDependencyUses = true;
        } else {
          inDependencyUses = false;
          const field = trimmed.match(/^([a-z_]+):\s*(.+)$/);
          if (!field) {
            diagnostics.push(diagnostic(file, lineNumber, "invalid dependency metadata entry"));
            continue;
          }
          if (!["ref", "commit", "owner_id", "repo_id"].includes(field[1])) {
            diagnostics.push(diagnostic(file, lineNumber, `unsupported dependency field ${JSON.stringify(field[1])}`));
            continue;
          }
          const value = parseScalar(field[2], file, lineNumber, diagnostics);
          if (dependency?.fields.has(field[1])) {
            diagnostics.push(diagnostic(file, lineNumber, `duplicate dependency field ${JSON.stringify(field[1])}`));
          } else if (dependency && value !== null) {
            dependency.fields.set(field[1], { value, line: lineNumber });
          }
          if (field[1] === "commit" && dependency && value !== null) {
            dependency.commit = { value, line: lineNumber };
          }
        }
      } else if (
        indent === 12 &&
        trimmed.startsWith("- ") &&
        currentDependency !== null &&
        inDependencyUses
      ) {
        const parsedDependency = parsePin(currentDependency, file, lineNumber, []);
        const dependency = parsedDependency ? dependencies.get(parsedDependency.canonical) : null;
        const rawPin = parseScalar(trimmed.slice(2), file, lineNumber, diagnostics);
        if (rawPin !== null) {
          const pin = parsePin(rawPin, file, lineNumber, diagnostics);
          if (pin && dependency) dependency.uses.push({ ...pin, line: lineNumber, raw: rawPin });
        }
      } else {
        diagnostics.push(diagnostic(file, lineNumber, "invalid indentation or entry in dependencies section"));
      }
      continue;
    }

    diagnostics.push(diagnostic(file, lineNumber, "entry appears outside a supported lockfile section"));
  }

  if (version !== SUPPORTED_LOCKFILE_VERSION) {
    diagnostics.push(
      diagnostic(
        file,
        1,
        `unsupported lockfile version ${JSON.stringify(version)}; expected ${SUPPORTED_LOCKFILE_VERSION}`,
      ),
    );
  }
  if (workflows.size === 0) diagnostics.push(diagnostic(file, 1, "workflows section is missing or empty"));
  if (dependencies.size === 0) diagnostics.push(diagnostic(file, 1, "dependencies section is missing or empty"));

  for (const [canonical, dependency] of dependencies) {
    for (const requiredField of ["ref", "commit", "owner_id", "repo_id"]) {
      if (!dependency.fields.has(requiredField)) {
        diagnostics.push(
          diagnostic(file, dependency.line, `dependency ${JSON.stringify(dependency.raw)} has no ${requiredField}`),
        );
      }
    }
    for (const idField of ["owner_id", "repo_id"]) {
      const metadata = dependency.fields.get(idField);
      if (metadata && !/^[1-9][0-9]*$/.test(metadata.value)) {
        diagnostics.push(
          diagnostic(file, metadata.line, `dependency ${idField} must be a positive decimal integer`),
        );
      }
    }
    if (!dependency.commit) {
      // The missing field was already reported with the complete required set.
    } else {
      const expected = `sha1-${dependency.sha}`;
      if (dependency.commit.value.toLowerCase() !== expected) {
        diagnostics.push(
          diagnostic(
            file,
            dependency.commit.line,
            `dependency ${JSON.stringify(dependency.raw)} commit must be ${JSON.stringify(expected)}`,
          ),
        );
      }
    }
    for (const child of dependency.uses) {
      if (!dependencies.has(child.canonical)) {
        diagnostics.push(
          diagnostic(
            file,
            child.line,
            `transitive dependency ${JSON.stringify(child.raw)} has no dependencies entry`,
          ),
        );
      }
    }
    if (canonical !== dependency.canonical) {
      diagnostics.push(diagnostic(file, dependency.line, "internal dependency normalization mismatch"));
    }
  }

  for (const pins of workflows.values()) {
    for (const pin of pins) {
      if (!dependencies.has(pin.canonical)) {
        diagnostics.push(
          diagnostic(file, pin.line, `workflow dependency ${JSON.stringify(pin.raw)} has no dependencies entry`),
        );
      }
    }
  }

  const reachable = new Set();
  const visit = (canonical) => {
    if (reachable.has(canonical)) return;
    reachable.add(canonical);
    for (const child of dependencies.get(canonical)?.uses ?? []) visit(child.canonical);
  };
  for (const pins of workflows.values()) for (const pin of pins) visit(pin.canonical);
  for (const dependency of dependencies.values()) {
    if (!reachable.has(dependency.canonical)) {
      diagnostics.push(
        diagnostic(file, dependency.line, `orphan dependency ${JSON.stringify(dependency.raw)} is not reachable`),
      );
    }
  }

  return { diagnostics, workflows, dependencies, version };
}

function extractUsesScalar(raw, file, line, diagnostics, { sequenceItem = false } = {}) {
  const match = raw.match(sequenceItem ? /^\s*-\s*uses\s*:\s*(.+)$/ : /^\s*uses\s*:\s*(.+)$/);
  if (!match) return null;
  return parseScalar(match[1], file, line, diagnostics);
}

function collectWorkflowUses(text, file, diagnostics) {
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  const uses = [];
  let blockScalarParentIndent = null;
  let jobsIndent = null;
  let currentJobIndent = null;
  let jobPropertyIndent = null;
  let stepsIndent = null;
  let currentStepIndent = null;
  let stepPropertyIndent = null;

  const resetJob = () => {
    currentJobIndent = null;
    jobPropertyIndent = null;
    stepsIndent = null;
    currentStepIndent = null;
    stepPropertyIndent = null;
  };

  const record = (raw, lineNumber, sequenceItem = false) => {
    const value = extractUsesScalar(raw, file, lineNumber, diagnostics, { sequenceItem });
    if (value !== null) uses.push({ line: lineNumber, value });
  };

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const raw = lines[index];
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue;
    const indent = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();

    if (blockScalarParentIndent !== null) {
      if (indent > blockScalarParentIndent) continue;
      blockScalarParentIndent = null;
    }
    if (/^\s*(?:-\s*)?[A-Za-z0-9_-]+\s*:\s*[>|][+-]?\s*(?:#.*)?$/.test(raw)) {
      blockScalarParentIndent = indent;
      continue;
    }

    if (indent === 0) {
      resetJob();
      jobsIndent = /^jobs\s*:\s*(?:#.*)?$/.test(trimmed) ? indent : null;
      continue;
    }
    if (jobsIndent === null || indent <= jobsIndent) continue;

    if (
      currentJobIndent === null ||
      (indent === currentJobIndent && /^[^\s-][^:]*:\s*(?:#.*)?$/.test(trimmed))
    ) {
      currentJobIndent = indent;
      jobPropertyIndent = null;
      stepsIndent = null;
      currentStepIndent = null;
      stepPropertyIndent = null;
      continue;
    }
    if (indent < currentJobIndent) {
      resetJob();
      continue;
    }

    if (stepsIndent !== null) {
      const leavesSteps = indent < stepsIndent || (indent === stepsIndent && !trimmed.startsWith("-"));
      if (leavesSteps) {
        stepsIndent = null;
        currentStepIndent = null;
        stepPropertyIndent = null;
      } else {
        if (trimmed.startsWith("-")) {
          currentStepIndent = indent;
          stepPropertyIndent = null;
          record(raw, lineNumber, true);
          continue;
        }
        if (currentStepIndent !== null && indent > currentStepIndent) {
          if (stepPropertyIndent === null) stepPropertyIndent = indent;
          if (indent === stepPropertyIndent) record(raw, lineNumber);
        }
        continue;
      }
    }

    if (jobPropertyIndent === null && !trimmed.startsWith("-")) jobPropertyIndent = indent;
    if (indent === jobPropertyIndent) {
      currentStepIndent = null;
      stepPropertyIndent = null;
      if (/^steps\s*:\s*(?:#.*)?$/.test(trimmed)) {
        stepsIndent = indent;
        continue;
      }
      record(raw, lineNumber);
      continue;
    }

  }

  return uses;
}

export function validateWorkflowText(text, file) {
  const diagnostics = [];
  const remotePins = [];
  for (const { line: lineNumber, value } of collectWorkflowUses(text, file, diagnostics)) {

    if (value.startsWith("docker://")) continue;
    if (value.startsWith("./")) continue;
    if (value.startsWith("$/")) {
      if (value.includes("@")) {
        diagnostics.push(diagnostic(file, lineNumber, "self-repository $/ references must not contain @ref"));
      }
      continue;
    }

    const pin = parsePin(value, file, lineNumber, diagnostics);
    if (pin) remotePins.push({ ...pin, line: lineNumber, raw: value });
  }

  return { diagnostics, remotePins };
}

async function workflowFiles(repositoryRoot) {
  const directory = path.join(repositoryRoot, WORKFLOWS_DIRECTORY);
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

export async function validateRepository(repositoryRoot = process.cwd()) {
  const root = path.resolve(repositoryRoot);
  const lockPath = path.join(root, LOCKFILE_PATH);
  const lockText = await readFile(lockPath, "utf8");
  const lockResult = validateLockfileText(lockText, LOCKFILE_PATH);
  const diagnostics = [...lockResult.diagnostics];
  const observedWorkflows = new Set();

  for (const absoluteFile of await workflowFiles(root)) {
    const relativeFile = path.relative(root, absoluteFile).replaceAll(path.sep, "/");
    const text = await readFile(absoluteFile, "utf8");
    const result = validateWorkflowText(text, relativeFile);
    diagnostics.push(...result.diagnostics);
    if (result.remotePins.length === 0) continue;
    observedWorkflows.add(relativeFile);

    const locked = lockResult.workflows.get(relativeFile) ?? [];
    const observedSet = new Set(result.remotePins.map((pin) => pin.canonical));
    const lockedSet = new Set(locked.map((pin) => pin.canonical));

    for (const pin of result.remotePins) {
      if (!lockedSet.has(pin.canonical)) {
        diagnostics.push(
          diagnostic(relativeFile, pin.line, `remote use ${JSON.stringify(pin.raw)} is absent from actions.lock`),
        );
      }
    }
    for (const pin of locked) {
      if (!observedSet.has(pin.canonical)) {
        diagnostics.push(
          diagnostic(LOCKFILE_PATH, pin.line, `stale workflow dependency ${JSON.stringify(pin.raw)} for ${relativeFile}`),
        );
      }
    }
  }

  for (const [workflow, pins] of lockResult.workflows) {
    if (pins.length > 0 && !observedWorkflows.has(workflow)) {
      diagnostics.push(
        diagnostic(LOCKFILE_PATH, pins[0].line, `lockfile records missing or action-free workflow ${workflow}`),
      );
    }
  }

  return { diagnostics };
}

function escapeWorkflowCommandProperty(value) {
  return String(value)
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A")
    .replaceAll(":", "%3A")
    .replaceAll(",", "%2C");
}

function escapeWorkflowCommandData(value) {
  return String(value).replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}

export function formatDiagnosticCommand(item) {
  const file = escapeWorkflowCommandProperty(item.file);
  const line = escapeWorkflowCommandProperty(item.line);
  const message = escapeWorkflowCommandData(item.message);
  return `::error file=${file},line=${line}::${message}`;
}

function printDiagnostics(diagnostics) {
  for (const item of diagnostics) process.stderr.write(`${formatDiagnosticCommand(item)}\n`);
}

async function main() {
  const repositoryRoot = process.argv[2] ?? process.cwd();
  try {
    const result = await validateRepository(repositoryRoot);
    if (result.diagnostics.length > 0) {
      printDiagnostics(result.diagnostics);
      process.stderr.write(`actions.lock structural validation failed with ${result.diagnostics.length} error(s).\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write("actions.lock structural validation passed.\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    printDiagnostics([diagnostic(LOCKFILE_PATH, 1, message)]);
    process.stderr.write("actions.lock structural validation failed closed.\n");
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) await main();
