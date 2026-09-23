# Tokenly

Local-first desktop app to track AI provider quotas (Codex, Antigravity).

Built with Tauri + React + TypeScript.

## Download

Installers are published on
[GitHub Releases](https://github.com/rakeshPatel-Dev/Tokenly/releases)
(`v0.1.0`):

| Platform | Package |
| --- | --- |
| Windows x64 | `Tokenly_0.1.0_x64-setup.exe` |
| macOS Apple Silicon | `Tokenly_0.1.0_aarch64.dmg` |
| macOS Intel | `Tokenly_0.1.0_x64.dmg` |
| Linux AppImage | `Tokenly_0.1.0_amd64.AppImage` |
| Debian / Ubuntu | `Tokenly_0.1.0_amd64.deb` |
| Fedora / RHEL | `Tokenly-0.1.0-1.x86_64.rpm` |

The download site in [`website/`](./website) links to these assets and
highlights the build for your OS.

## Release

1. Bump `version` in `package.json` and `src-tauri/tauri.conf.json` (and `Cargo.toml` if needed).
2. Update `RELEASE_TAG` / `APP_VERSION` in `website/src/lib/downloads.ts` to match.
3. Push to the `release` branch (or run **Actions → release → Run workflow**).

CI builds Windows / macOS / Linux, creates GitHub Release `vX.Y.Z`, and uploads the installers. Users download from [Releases](https://github.com/rakeshPatel-Dev/Tokenly/releases).

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
