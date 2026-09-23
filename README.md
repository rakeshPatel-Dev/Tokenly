# Tokenly

Local-first desktop app to track AI provider quotas (Codex, Antigravity).

Built with Tauri + React + TypeScript.

## Download

Installers: [GitHub Releases](https://github.com/rakeshPatel-Dev/Tokenly/releases).  
The [`website/`](./website) fetches the latest release assets automatically.

## Release

1. Bump `version` in `package.json` and `src-tauri/tauri.conf.json` (keep `Cargo.toml` in sync).
2. Push to `release` (or **Actions → release → Run workflow**).

CI creates the GitHub Release and uploads installers; the website picks them up with no extra edit.

```bash
git checkout -B release main
git push -u origin release
```

## Develop

```bash
pnpm install
pnpm tauri dev
```

### Website

```bash
cd website
pnpm install
pnpm dev
```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
