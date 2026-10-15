# Contributing to Aegis Guard

Help make voluntary browsing boundaries easier to use. Bug fixes, accessibility improvements, documentation, and reproducible reports are welcome.

## Report an issue

Use the bug report or feature request template. Include your Windows version, how you built the app, expected behavior, actual behavior, and steps to reproduce. Remove personal domains, PINs, usernames, and other private details from screenshots and logs. Report vulnerabilities using [SECURITY.md](SECURITY.md).

## Make a change

1. Fork the repository and create a focused branch.
2. Follow the development instructions in [README.md](README.md#development).
3. Explain the problem and the resulting behavior in your pull request. Include screenshots for visible interface changes.
4. Run the relevant checks below and describe the results.

```powershell
npm ci
npm run build
cargo test --manifest-path src-tauri/Cargo.toml --lib --features custom-protocol --locked -- --include-ignored
git diff --check
```

Use the isolated browser fixture for interface work. Running the native app as administrator can modify DNS, the hosts file, and browser policies. Do not run live enforcement during automated tests. Add regression coverage for meaningful behavior changes, especially domain exclusions, pause/PIN checks, and system-setting changes.

## Design principles

- Respect the user's chosen boundaries and leave YouTube restrictions alone.
- Describe system changes and persistence clearly, including what quitting does.
- Keep sensitive actions behind the existing administrator and PIN checks.
- Avoid shaming language, recovery guarantees, and misleading protection metrics.
- Preserve unrelated Windows and browser settings wherever possible.

Keep discussions constructive and respectful. Contributions are provided under the repository's MIT license.
