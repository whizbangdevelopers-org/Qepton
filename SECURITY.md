# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email us at: **support@whizbangdevelopers.com**

Include the following in your report:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Any suggested fixes (optional)

### What to Expect

- **Acknowledgment:** We will acknowledge receipt within 48 hours
- **Initial Assessment:** We will provide an initial assessment within 7 days
- **Resolution Timeline:** We aim to resolve critical issues within 30 days
- **Credit:** We will credit you in our release notes (unless you prefer anonymity)

### Scope

The following are in scope:
- Qepton desktop application (Electron)
- Qepton web application (PWA)
- Qepton mobile application (Capacitor)
- GitHub OAuth flow
- Local data storage and encryption

The following are out of scope:
- Issues in third-party dependencies (report to the respective maintainers)
- GitHub Gist API vulnerabilities (report to GitHub)
- Social engineering attacks
- Physical attacks

## Security Best Practices for Users

1. **Use a strong GitHub token** with minimal required permissions
2. **Keep Qepton updated** to receive the latest security patches
3. **Review gist permissions** regularly in your GitHub settings
4. **Use OAuth** instead of Personal Access Tokens when available

## Security Features

- OAuth 2.0 with PKCE for authentication
- Local encryption for stored credentials
- No server-side data storage (peer-to-peer with GitHub)
- Regular dependency updates via Dependabot
- Automated security scanning with CodeQL
