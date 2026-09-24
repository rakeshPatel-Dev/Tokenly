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

## Managing Multiple Accounts

Tokenly allows you to track multiple `agy` and `codex` accounts simultaneously. Because these CLIs store their credentials in your home directory, you can manage multiple accounts by pointing the CLI to different folders.

### 1. Log into a new account
To log into a second account without overriding your default one, run the CLI with a custom `HOME` (for Antigravity) or `CODEX_HOME` (for Codex) variable:

**For Antigravity:**
```bash
HOME=~/.agy-work agy
```
*(Follow the login prompts in your browser using your work account)*

**For Codex:**
```bash
CODEX_HOME=~/.codex-work codex login
```

### 2. Add it to Tokenly
If you name your folders starting with `.agy-` or `.codex-` (e.g., `~/.agy-school`, `~/.codex-client`), Tokenly will **automatically discover them** on its first launch!

If you used a different folder name, or Tokenly is already running:
1. Open Tokenly and click **Add account** (+).
2. Type your folder path into the "Profile folder" box (e.g., `~/.agy-work`).
3. Click **Check connection** to verify, then click **Save**.

### 3. Using your accounts in the terminal
When you want to run actual commands using your secondary accounts, you must tell the CLI which folder to use. 

To avoid typing the folder path every time, add **aliases** to your `~/.bashrc` or `~/.zshrc` file:

```bash
alias agy-work="HOME=~/.agy-work agy"
alias codex-work="CODEX_HOME=~/.codex-work codex"
```

Now you can simply run:
* `agy-work <command>` (Uses your work account quota)
* `agy <command>` (Uses your default account quota)

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
