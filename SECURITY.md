# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this repository, please do **not** open a public issue. Instead, please report it privately to the repository maintainer.

**Contact:** alert@lcvmail.com

Please include:
- Description of the vulnerability
- Steps to reproduce (if applicable)
- Potential impact
- Suggested fix (if you have one)

We will acknowledge your report within 24 hours and work to resolve the issue promptly.

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | ✅ |
| Previous releases | ⚠️ Security updates only |

## Security Measures

This repository employs:
- **Code Scanning (CodeQL)**: Automated static analysis on all commits
- **Dependency Scanning (Dependabot)**: Automated dependency vulnerability detection
- **Secret Scanning**: Detection and remediation of exposed secrets
- **Branch Protection**: Required status checks before merge to main

## Best Practices

- Keep dependencies up-to-date
- Use strong authentication (SSH keys, personal access tokens)
- Review pull requests carefully before merge
- Report any suspicious activity immediately

