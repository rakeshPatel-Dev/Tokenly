# Tech Stack

> Reference architecture for Tokenly from [PRD.md](./PRD.md) §21.

| Layer | Technology | Version / Spec |
|---|---|---|
| Desktop shell | Tauri | 2.x |
| Frontend language | TypeScript | ~5.x / ~6.x |
| Frontend framework | React | 18 / 19 |
| Styling | Tailwind CSS | 4.x / 3.x |
| UI components | shadcn/ui | latest |
| Local backend | Rust (Tauri commands) | 1.80+ (edition 2021) |
| Database | SQLite | rusqlite / Tauri SQLite plugin |
| Credential storage | OS Keychain / Secret Service | OS native |
| Provider integrations | OpenAI Codex CLI & app-server<br/>Google Antigravity CLI (`agy`) | Local CLI execution / IPC |
