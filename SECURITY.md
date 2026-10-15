# Security policy

## Scope

Aegis Guard modifies Windows DNS, hosts entries, and browser policies, and provides PIN-gated controls. Security reports are especially useful for command injection, unintended system changes, sensitive data exposure, and bypasses of application authorization checks.

The app supports voluntary browsing boundaries. A user with administrator access can alter system settings outside the app; administrator resistance is not a promised security boundary.

## Reporting a vulnerability

Use [GitHub's private vulnerability reporting page](https://github.com/NY-Henry/aegis-adult-content-blocker/security/advisories/new) if it is enabled. If it is unavailable, open an issue asking for a private contact method without including exploit details or sensitive data.

Include the affected commit or version, reproduction steps, impact, and a minimal demonstration. Never include real PINs, PIN verification data, personal browsing histories, or unredacted configuration files.

Security fixes target the latest code on `main`. There is no guaranteed response time or long-term support commitment for older builds.
