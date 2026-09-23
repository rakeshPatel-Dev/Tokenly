# Tokenly — Development Phases

> Derived from [PRD.md](./PRD.md) §21 (Desktop Architecture) and §31 (Initial Development Order).

---

## Tech Stack

| Layer | Technology | Must Install? |
|---|---|---|
| Desktop shell | [Tauri](https://tauri.app/) | ✅ Yes — requires Rust + OS WebView |
| Frontend language | TypeScript | ✅ Yes — via Node.js |
| Frontend framework | React | ✅ Yes — via npm/pnpm |
| Styling | Tailwind CSS | ✅ Yes — via npm/pnpm |
| UI components | shadcn/ui | ✅ Yes — via CLI (`npx shadcn@latest init`) |
| Backend | Rust (Tauri commands) | ✅ Yes — install Rust via `rustup` |
| Database | SQLite | ✅ Yes — via `rusqlite` crate (Rust) or `better-sqlite3` (Node) |
| Credential storage | OS Keychain / Credential Manager | ⚙️ Built-in — provided by OS (no install needed) |
| Provider #1 | OpenAI Codex CLI | ✅ Yes — user must have Codex installed & authenticated |
| Provider #2 | Google Antigravity CLI (`agy`) | ✅ Yes — user must have `agy` installed & authenticated |

### Installation Quickstart

```bash
# 1. Install Rust (required for Tauri backend)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Install Node.js (LTS recommended) — required for frontend tooling
# https://nodejs.org or use a version manager like fnm/nvm

# 3. Install Tauri CLI
cargo install tauri-cli
# or via npm:
npm install --save-dev @tauri-apps/cli

# 4. Install frontend dependencies (after scaffolding)
npm install
# or
pnpm install

# 5. Init shadcn/ui
npx shadcn@latest init

# 6. Ensure provider CLIs are available
codex --version     # OpenAI Codex CLI
agy --version       # Google Antigravity CLI
```

> **Note:** On Linux, Tauri also requires `webkit2gtk` and related system libraries.
> See the [Tauri Prerequisites guide](https://tauri.app/start/prerequisites/) for your OS.

---

## Phase 1 — Foundation

**Goal:** Scaffold the project and wire up the core data layer before any provider logic.

### Tasks

- [ ] Initialize Tauri + React + TypeScript project
- [ ] Configure Tailwind CSS
- [ ] Integrate shadcn/ui component library
- [ ] Set up SQLite database with the following tables:
  - `accounts`
  - `usage_snapshots`
  - `settings`
  - `provider_metadata`
- [ ] Implement OS keychain abstraction for sensitive credential storage
- [ ] Define `ProviderAdapter` interface (TypeScript + Rust boundary)
- [ ] Implement `AccountRepository` (CRUD over SQLite)
- [ ] Implement `UsageRepository` (CRUD over SQLite)
- [ ] Establish `src/providers/`, `src/core/`, `src/database/`, `src/ui/` directory structure

### Deliverable

A running Tauri shell with an empty dashboard, a working database layer, and a typed provider adapter interface — but no real provider data yet.

---

## Phase 2 — Codex Provider

**Goal:** Integrate with the locally installed OpenAI Codex app-server to read quota data.

### Prerequisites

- Codex CLI installed on the user's machine
- User authenticated with at least one Codex account

### Tasks

- [ ] Detect whether Codex is installed (`codex --version`)
- [ ] Detect whether the Codex app-server is available
- [ ] Detect authentication state via Codex auth mechanisms
- [ ] Support isolated Codex profiles via separate `CODEX_HOME` directories (e.g. `~/.codex-personal/`, `~/.codex-work/`)
- [ ] Implement `CodexAdapter` with:
  - [ ] `detect()` — checks Codex installation
  - [ ] `discoverAccounts()` — scans known profile directories
  - [ ] `authenticate()` — delegates to Codex auth (no password collection)
  - [ ] `getAccountInfo()` — calls `account/read`
  - [ ] `getUsage()` — calls `account/rateLimits/read`, returns `UsageWindow[]`
  - [ ] `disconnect()` — removes account + clears stored profile reference
- [ ] Parse `primary`, `secondary`, `rateLimitsByLimitId`, `planType`, credit info, `resetsAt`
- [ ] Preserve `unknown/unavailable` state when fields are missing
- [ ] Record `providerVersion` (Codex version) on every refresh
- [ ] Surface provider errors without exposing credentials
- [ ] Display Codex quota on the dashboard with source indicator: `Source: Codex app-server`
- [ ] Test with multiple Codex profiles

### Deliverable

Dashboard shows real Codex quota (remaining %, reset time, last updated) for one or more accounts.

---

## Phase 3 — Antigravity Provider

**Goal:** Integrate with the locally installed `agy` CLI to read quota data.

### Prerequisites

- `agy` CLI installed on the user's machine
- User authenticated with at least one Google account via `agy`

### Tasks

- [ ] Detect whether `agy` is installed (`agy --version`)
- [ ] Detect installed CLI version and record it as `providerVersion`
- [ ] Detect authentication state (check if `agy` is logged in)
- [ ] Implement `AntigravityAdapter` with:
  - [ ] `detect()` — checks `agy` installation
  - [ ] `discoverAccounts()` — identifies authenticated Google accounts
  - [ ] `authenticate()` — delegates entirely to `agy` auth (no password collection)
  - [ ] `getAccountInfo()` — resolves Google account identity
  - [ ] `getUsage()` — executes `agy --print /usage --output-format json`, returns `UsageWindow[]`
  - [ ] `disconnect()` — removes account reference
- [ ] Parse JSON output: `groups`, `buckets`, `window`, `remaining_fraction`, `reset_time`
- [ ] Normalize all quota buckets into `UsageWindow[]`
- [ ] Handle unknown future bucket types gracefully (tolerant parser)
- [ ] Identify the active Google account; mark as `Identity unverified` if identity cannot be confirmed
- [ ] Display account as `Antigravity · personal@gmail.com` (never just `Antigravity`)
- [ ] Never log OAuth credentials or raw auth responses
- [ ] Display Antigravity quota on the dashboard with source indicator: `Source: agy CLI`
- [ ] Test with multiple `agy` accounts

### Deliverable

Dashboard shows real Antigravity quota alongside Codex for all connected accounts.

---

## Phase 4 — Reliability & Error Handling

**Goal:** Make the app production-worthy with robust refresh, error representation, and security hardening.

### Tasks

- [ ] Implement refresh scheduler:
  - Foreground: every **60 seconds**
  - Background: every **5 minutes**
  - Configurable intervals via settings
- [ ] Implement manual `[ Refresh ]` button (per account and global)
- [ ] Display `fetchedAt` timestamp — e.g. `Updated 18 seconds ago`
- [ ] Implement all connection/data states:
  - `connected`, `refreshing`, `stale`, `error`, `unauthenticated`, `unsupported`, `unavailable`, `identity_unverified`
- [ ] Handle stale data: show last successful refresh timestamp on error
- [ ] Implement version compatibility guard:
  - Detect provider CLI version changes
  - Alert user when parsing fails after an upgrade (show last successful version)
- [ ] Implement security requirements:
  - Never log access tokens or raw auth responses
  - Redact credentials from error messages and crash reports
  - Complete account disconnect/removal operation
- [ ] Do not replace missing data with fake zeroes — display `Usage unavailable` with reason
- [ ] Store `providerVersion` for every refresh snapshot
- [ ] Avoid aggressive refresh — respect process startup cost of CLIs

### Deliverable

App handles all error and edge-case states correctly, refresh is stable, and no sensitive data is ever leaked in logs or errors.

---

## Phase 5 — UX Polish

**Goal:** Deliver the full dashboard experience with all must-have UI elements and nice-to-have features.

### Tasks

#### Must Have
- [ ] Main dashboard — account cards sorted by quota availability
- [ ] Usage progress bar per account (e.g. `████████░░ 82% remaining`)
- [ ] Reset countdown display (e.g. `Resets in 2h 14m`)
- [ ] Exact reset timestamp (e.g. `Resets Sep 23, 2026 at 4:30 PM`)
- [ ] Provider source indicator on every card (`Source: Codex app-server` / `Source: agy CLI`)
- [ ] Account detail view (provider, email, plan, account ID, usage history, last refresh, disconnect button)
- [ ] `+ Add Account` flow
- [ ] Low-quota color indicators (🟢 / 🟡 / 🔴)
- [ ] Connection status badge per account

#### Nice to Have
- [ ] Usage history timeline (hourly snapshots)
- [ ] System tray icon with quick summary
- [ ] Low-quota desktop notification
- [ ] Reset-time notification (`Codex · work@gmail.com resets in 15 minutes`)
- [ ] "Next available account" view
- [ ] Compact desktop widget / mini mode

### Deliverable

A polished, shippable v1 desktop app that passes all [MVP success criteria](./PRD.md#29-success-criteria).

---

## Phase Summary

```text
Phase 1 — Foundation      Tauri + React + SQLite + adapter interface
Phase 2 — Codex           Codex app-server integration + multi-profile
Phase 3 — Antigravity     agy CLI integration + account identity
Phase 4 — Reliability     Refresh scheduler + error states + security
Phase 5 — UX              Dashboard polish + tray + notifications
```
