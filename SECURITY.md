# Security Policy

## Supported status

Latest supported release: v02.15.01. The current main branch is also supported for security fixes until the next release is published.

## Reporting a vulnerability

Please do not open a public issue for suspected vulnerabilities, credential leaks, private data exposure, authentication bypasses, payment-flow issues, supply-chain issues, or deployment misconfiguration.

Report privately by email:

- lcv@lcv.dev

If GitHub private vulnerability reporting is enabled for this repository, that channel is also acceptable.

Please include:

- affected repository, component, route, package, workflow, or public surface;
- affected version, release tag, commit SHA, or deployment URL when known;
- impact and exploitability;
- reproduction steps or a safe proof of concept, if available;
- whether any credential, personal data, payment data, private editorial material, or operational secret may be involved.

## Scope

In scope: application code, Workers/Pages functions, package publication, GitHub Actions, dependency and supply-chain configuration, repository publication boundaries, security documentation, and public service configuration documented in this repository.

Out of scope: social engineering, physical attacks, denial-of-service testing without prior written authorization, spam, automated noisy scanning, and reports that rely only on outdated browser or dependency versions without a concrete vulnerable path in this repository.

## Coordinated disclosure

LCV Ideas & Software will triage reports privately, request clarification when needed, and coordinate remediation before public disclosure. Public disclosure should wait until a fix or mitigation is available, unless there is an immediate user-safety reason to do otherwise.
