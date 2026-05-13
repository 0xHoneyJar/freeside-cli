# Security Policy

## Supported Versions

Only the latest published version of `@0xhoneyjar/freeside-cli` receives security updates while in alpha. Once stable (1.0.0+), we will maintain the current major version with security patches.

## Reporting a Vulnerability

If you discover a security vulnerability:

1. **Do NOT open a public GitHub issue** for the disclosure
2. Email `security@0xhoneyjar.xyz` with:
   - Description of the vulnerability
   - Reproducer steps if available
   - Impact assessment (severity, affected versions)
3. Expect acknowledgement within 72 hours
4. We aim to release a patch within 14 days of confirmed-severity findings

## What's in scope

- The CLI itself (`@0xhoneyjar/freeside-cli`)
- Credential adapters wired into the CLI (e.g. OS keychain integration in v0.2+)
- MCP server surface (`freeside --mcp`)
- Output envelope handling (any prompt-injection escape via TTY/JSON output)

## Out of scope

- Vulnerabilities in upstream dependencies (file with the upstream)
- Issues requiring physical access to the developer's machine
- DoS via deliberately large input payloads (we'll triage but it's not a v0 concern)

## Hall of Fame

We acknowledge contributors who responsibly disclose vulnerabilities. Names added on patch ship.
