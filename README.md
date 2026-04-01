# Solana Mobile Web Shell

Solana Mobile Web Shell is a Command Line Interface (CLI) that helps developers generate an Android app project that wraps an existing web app or website inside an Android WebView.

## Why

Browsers are rolling out Local Network Access restrictions that can break Mobile Wallet Adapter flows on Android web, especially flows that rely on local network or loopback communication for wallet association.

Android web apps and native app wrappers that use Custom Chrome Tabs, including Bubblewrap-style APKs, can be affected by this change.

Solana Mobile Web Shell exists to work around those browser-side restrictions by moving the app into an Android WebView shell while preserving Mobile Wallet Adapter functionality.

References:
- https://developer.chrome.com/blog/local-network-access
- https://github.com/WICG/local-network-access

## What It Does

- generates an Android project for wrapping an existing web app, website, or PWA
- keeps in-scope navigation inside the app and opens out-of-scope links in the system browser
- intercepts `solana-wallet://` and related wallet handoff flows natively
- supports app name, application ID, icons, splash branding, signing metadata, and Android version configuration
- accepts both standard web `manifest.json` files and Bubblewrap-style `twa-manifest.json` files

## Install

```bash
npm install -g @solanamobile/webshell-cli
```

## Quick Start

```bash
mwa-webshell init ./my-app --manifest https://example.com/manifest.json
mwa-webshell build ./my-app
mwa-webshell doctor ./my-app --fix
```

For CLI usage details, see [cli/README.md](/Users/thefunnyintrovert/MwaWebShell/cli/README.md).

## Temporary MWA Compatibility Note

This CLI does not install or update the JavaScript Mobile Wallet Adapter packages used by the web app loaded inside the shell.

For Web Shell support, teams should use a Web Shell-capable Solana Mobile MWA canary or a later compatible release. The current minimum known-good baseline for this repo is:

- https://www.npmjs.com/package/@solana-mobile/wallet-adapter-mobile/v/0.0.0-canary-20260331201049

Older releases may ignore Web Shell or MWS behavior in WebView. Replace this note once the same support is available in a stable upstream release.

## Development

```bash
cd cli
npm install
npm run build
npm test
```
