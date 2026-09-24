# Multi-Account Tracking — Implementation Plan

## Goal

Allow users to add **any number of `agy` / `codex` accounts** that are logged in
on this machine (even if they are not the currently active OS account), and have
Tokenly track their usage / quota / reset timers automatically — exactly the same
as it does today for the default profile, but for every profile the user adds.

---

## How It Works (Concept)

`agy` and `codex` store all credentials and config in a **directory** on disk:

| Provider | Default directory |
|---|---|
| Antigravity (`agy`) | `~/.gemini/` (respects `$HOME`) |
| Codex | `~/.codex` (respects `$CODEX_HOME`) |

To use a **different account** you simply point the CLI at a different directory:

```sh
# Log another Google account into a separate home
HOME=~/.agy-work agy
# → credentials written to ~/.agy-work/.gemini/

# Log another OpenAI account into a separate codex home
CODEX_HOME=~/.codex-work codex login
```

Once logged in, Tokenly can query that profile by passing the custom path to the
CLI — which **the Rust backend already supports** via `auth_profile_id`. The
only thing missing is:

1. **Startup auto-import** — detect all existing profiles at launch and add them
   as accounts automatically (so the user doesn't have to add them manually if
   they've already set up multiple profiles).
2. **First-run wizard** — guide a new user through adding their first account
   from scratch (currently the empty state just shows "No accounts yet").
3. **Profile path validation** — confirm the path exists and is logged in before
   saving.
4. **Bug: email not updated after save** — after `refreshAccount` runs the email
   comes back from the CLI, but the in-memory `accounts` state in `App.tsx` is
   not re-fetched, so the card shows no email until next full reload.
5. **Scheduler doesn't update account metadata** — `fetch_windows_for_account`
   in `scheduler.rs` writes snapshots but never updates `email` / `plan` on the
   `AccountRecord` in the DB (only `commands::refresh_account` does).

Fix all five and multi-account support is complete.

---

## What Is Already Done ✅

| Piece | Status |
|---|---|
| DB schema — `accounts` table with `auth_profile_id` | ✅ Done |
| DB schema — `usage_snapshots` with `account_id` FK | ✅ Done |
| `query_codex_rate_limits(codex_home)` — accepts custom path | ✅ Done |
| `query_antigravity_usage(agy_home)` — accepts custom path | ✅ Done |
| `refresh_account` command — reads `auth_profile_id` and passes it | ✅ Done |
| `scheduler::fetch_windows_for_account` — reads `auth_profile_id` | ✅ Done |
| `AddAccountModal` — has profile folder input + "Check connection" | ✅ Done |
| Dashboard — renders all accounts from DB | ✅ Done |

---

## What Needs To Be Built 🔨

### Step 1 — Fix: email / plan not refreshed in UI after `refreshAccount`

**File:** `src/App.tsx`

**Problem:** After `api.refreshAccount(id)` succeeds, the function updates
`usageMap` state but does not re-fetch the account list, so `email` and `plan`
that the CLI just discovered are sitting in the DB but never shown.

**Fix:** After every successful `refreshAccount` call, also call
`api.listAccounts()` and update the `accounts` state.

```ts
// In the onRefreshAccount handler in App.tsx:
const windows = await api.refreshAccount(accountId);
setUsageMap(prev => ({ ...prev, [accountId]: windows }));
// ADD THIS:
const fresh = await api.listAccounts();
setAccounts(fresh);
```

---

### Step 2 — Fix: scheduler doesn't write email / plan back to DB

**File:** `src-tauri/src/scheduler.rs` → `fetch_windows_for_account`

**Problem:** The scheduler snapshots quota windows but never updates
`email` / `plan` / `provider_account_id` on the account row, so those fields
stay `NULL` for accounts added before the first manual refresh.

**Fix:** Return a mutated `AccountRecord` alongside the windows and write it.

```rust
// Change return type to (Vec<UsageWindowRecord>, AccountRecord)
fn fetch_windows_for_account(acc: &AccountRecord) -> (Vec<UsageWindowRecord>, AccountRecord) {
    let mut acc = acc.clone();
    // existing logic ...
    if res.success {
        if let Some(email) = res.email { acc.email = Some(email); }
        if let Some(plan)  = res.plan_type { acc.plan = Some(plan); }
        // ...
    }
    (snapshots, acc)
}

// In run_refresh_cycle, after the call:
let (windows, updated_acc) = fetch_windows_for_account(&acc);
// save updated_acc + windows to DB
```

---

### Step 3 — Auto-import existing profiles on first launch

**File:** `src-tauri/src/commands.rs` (new command) + `src/App.tsx`

**Goal:** When Tokenly starts and the DB has zero accounts, automatically
discover all `agy` / `codex` profiles on the machine and insert them so the
dashboard isn't empty.

#### 3a — New Rust command: `auto_import_profiles`

```rust
#[tauri::command]
pub async fn auto_import_profiles(state: State<'_, DbState>) -> Result<Vec<AccountRecord>, String> {
    // 1. Check if DB already has accounts — if yes, skip
    // 2. Discover codex profiles via codex::discover_codex_profiles()
    // 3. For each codex profile dir:
    //    - call query_codex_rate_limits(Some(path))
    //    - if authenticated, create AccountRecord and save to DB
    // 4. Discover agy profiles (default ~/.gemini + any HOME=~/.agy-* dirs)
    // 5. For each agy profile:
    //    - call query_antigravity_usage(Some(path))
    //    - if authenticated, create AccountRecord and save to DB
    // 6. Return all newly created accounts
}
```

Already-available helpers:
- `codex::discover_codex_profiles()` — finds `~/.codex`, `~/.codex-*` dirs
- `codex::query_codex_rate_limits(home)` — queries and returns `authenticated`
- `antigravity::query_antigravity_usage(home)` — same for `agy`

**Note:** For `agy`, profile discovery should scan `$HOME` for any directory
matching `~/.agy-*` (i.e. `~/.agy-work`, `~/.agy-personal`) **plus** the
default `~/.gemini`. Add a `discover_agy_profiles()` function in
`antigravity.rs` mirroring `codex::discover_codex_profiles()`.

#### 3b — Call on startup in `App.tsx`

```ts
useEffect(() => {
  async function init() {
    const accounts = await api.listAccounts();
    if (accounts.length === 0) {
      // First launch — try auto-import
      const imported = await api.autoImportProfiles();
      setAccounts(imported);
    } else {
      setAccounts(accounts);
    }
    // ... load usage for each account
  }
  init();
}, []);
```

Register the new command in `lib.rs`:
```rust
commands::auto_import_profiles,
```

And expose it in `src/core/api.ts`:
```ts
async autoImportProfiles(): Promise<Account[]> {
  if (!isTauri()) return browserAccounts;
  const raw = await invoke<RawAccountRecord[]>("auto_import_profiles");
  return raw.map(mapAccount);
},
```

---

### Step 4 — Profile path validation in AddAccountModal

**File:** `src/ui/components/AddAccountModal.tsx`

**Current behavior:** The "Check connection" button is optional — users can
click Save without testing. If they enter a wrong path, the account is saved
but will always show as an error.

**Fix:** Make Save disabled until "Check connection" has passed.

```tsx
// Disable Save if test hasn't been run and succeeded
<button
  onClick={handleSave}
  disabled={isSaving || !testResult?.success}
  className="btn btn-primary"
>
```

Also add inline path hint text below the input:

```tsx
<p className="mt-1 text-[11px] text-[var(--t-ink-8)]">
  Leave blank to use the default profile.
  For another account: <code>HOME=~/.agy-work agy</code>, then enter <code>~/.agy-work</code>.
</p>
```

---

### Step 5 — `discover_agy_profiles()` in `antigravity.rs`

**File:** `src-tauri/src/antigravity.rs`

New function to match Codex's existing `discover_codex_profiles()`:

```rust
pub fn discover_agy_profiles() -> Vec<PathBuf> {
    let mut profiles = Vec::new();
    if let Some(home) = dirs::home_dir() {
        // Default profile: ~/.gemini exists = agy logged in under $HOME
        if home.join(".gemini").join("antigravity-cli").exists() {
            profiles.push(home.clone());
        }
        // Extra profiles: any ~/.agy-<name> directory
        if let Ok(entries) = std::fs::read_dir(&home) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with(".agy-") && entry.path().is_dir() {
                    profiles.push(entry.path());
                }
            }
        }
    }
    if profiles.is_empty() {
        if let Some(home) = dirs::home_dir() {
            profiles.push(home); // push default even if not yet logged in
        }
    }
    profiles
}
```

---

### Step 6 — Wire `auto_import_profiles` command fully

**File:** `src-tauri/src/commands.rs`

Full implementation using helpers from Steps 3 and 5:

```rust
#[tauri::command]
pub async fn auto_import_profiles(
    state: State<'_, DbState>,
) -> Result<Vec<AccountRecord>, String> {
    // Skip if accounts already exist
    {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        let existing = db::list_accounts(&conn).map_err(|e| e.to_string())?;
        if !existing.is_empty() {
            return Ok(existing);
        }
    }

    let mut new_accounts: Vec<AccountRecord> = Vec::new();

    // --- Codex profiles ---
    let codex_profiles = codex::discover_codex_profiles();
    for profile_path in codex_profiles {
        let path_str = profile_path.to_string_lossy().to_string();
        let res = tauri::async_runtime::spawn_blocking({
            let p = path_str.clone();
            move || codex::query_codex_rate_limits(Some(&p))
        }).await.map_err(|e| e.to_string())?;

        if res.authenticated {
            let now = chrono::Utc::now().to_rfc3339();
            let acc = AccountRecord {
                id: format!("codex-{}", uuid::Uuid::new_v4()),
                provider: "codex".into(),
                provider_account_id: res.account_id,
                email: res.email.clone(),
                display_name: res.email
                    .as_deref()
                    .map(|e| format!("Codex ({})", e))
                    .or(Some("Codex".into())),
                plan: res.plan_type,
                auth_profile_id: path_str,
                enabled: true,
                last_checked_at: Some(now.clone()),
                created_at: now.clone(),
                updated_at: now,
            };
            let conn = state.conn.lock().map_err(|e| e.to_string())?;
            db::save_account(&conn, &acc).map_err(|e| e.to_string())?;
            // Also save the usage windows we already have
            for w in res.windows {
                let snap = UsageWindowRecord { /* ... map fields ... */ };
                let _ = db::save_usage_snapshot(&conn, &snap);
            }
            new_accounts.push(acc);
        }
    }

    // --- Antigravity profiles ---
    let agy_profiles = antigravity::discover_agy_profiles();
    for profile_path in agy_profiles {
        let path_str = profile_path.to_string_lossy().to_string();
        let res = tauri::async_runtime::spawn_blocking({
            let p = path_str.clone();
            move || antigravity::query_antigravity_usage(Some(&p))
        }).await.map_err(|e| e.to_string())?;

        if res.authenticated {
            let now = chrono::Utc::now().to_rfc3339();
            let acc = AccountRecord {
                id: format!("antigravity-{}", uuid::Uuid::new_v4()),
                provider: "antigravity".into(),
                provider_account_id: None,
                email: res.email.clone(),
                display_name: res.email
                    .as_deref()
                    .map(|e| format!("Antigravity ({})", e))
                    .or(Some("Antigravity".into())),
                plan: None,
                auth_profile_id: path_str,
                enabled: true,
                last_checked_at: Some(now.clone()),
                created_at: now.clone(),
                updated_at: now,
            };
            let conn = state.conn.lock().map_err(|e| e.to_string())?;
            db::save_account(&conn, &acc).map_err(|e| e.to_string())?;
            for w in res.windows {
                let snap = UsageWindowRecord { /* ... map fields ... */ };
                let _ = db::save_usage_snapshot(&conn, &snap);
            }
            new_accounts.push(acc);
        }
    }

    Ok(new_accounts)
}
```

---

## Complete File Change Summary

| File | What Changes |
|---|---|
| `src-tauri/src/antigravity.rs` | Add `discover_agy_profiles()` function |
| `src-tauri/src/commands.rs` | Add `auto_import_profiles` command; fix scheduler metadata write in `refresh_account` |
| `src-tauri/src/scheduler.rs` | `fetch_windows_for_account` returns `(Vec<UsageWindowRecord>, AccountRecord)`; `run_refresh_cycle` writes updated account row |
| `src-tauri/src/lib.rs` | Register `commands::auto_import_profiles` in `invoke_handler` |
| `src/core/api.ts` | Add `autoImportProfiles()` method |
| `src/App.tsx` | On startup: if 0 accounts, call `autoImportProfiles()`; after `refreshAccount`, re-fetch account list |
| `src/ui/components/AddAccountModal.tsx` | Disable Save until test passes; improve hint text |

**No DB schema changes needed** — the existing `accounts` and `usage_snapshots`
tables already support multiple rows with different `auth_profile_id` values.

---

## Implementation Order

Do these in order — each step makes the next one testable:

```
Step 2 → Step 5 → Step 6 → Step 3 → Step 1 → Step 4
  ↑           ↑        ↑       ↑        ↑        ↑
scheduler  discover  command  App.tsx  UI fix  UX fix
  fix       agy       wired   wired  re-fetch  Save guard
```

1. **Step 2** — Fix scheduler so it writes email/plan to DB on background refresh
2. **Step 5** — Add `discover_agy_profiles()` to `antigravity.rs`
3. **Step 6** — Implement `auto_import_profiles` in `commands.rs`
4. **Step 3** — Wire the command into `lib.rs`, `api.ts`, and `App.tsx` startup
5. **Step 1** — Fix `App.tsx` to re-fetch accounts after `refreshAccount`
6. **Step 4** — Enforce "Check connection" before allowing Save in `AddAccountModal`

---

## Testing Checklist

After implementation, verify each scenario:

- [ ] **Single account, first launch**: DB empty → `auto_import_profiles` runs →
      default `agy` + `codex` profile discovered and shown automatically.
- [ ] **Multiple `agy` profiles**: `~/.agy-work` and `~/.agy-personal` both logged
      in → both auto-imported and shown as separate cards.
- [ ] **Multiple `codex` profiles**: `~/.codex` and `~/.codex-work` both logged
      in → both auto-imported.
- [ ] **Mix**: 2 agy + 1 codex accounts all tracked simultaneously.
- [ ] **Manual Add**: Open modal, enter a valid profile path, "Check connection"
      passes, Save works, card appears with correct email.
- [ ] **Manual Add invalid path**: "Check connection" fails → Save button stays
      disabled.
- [ ] **Background refresh**: Minimize window, wait for background tick → email
      / plan fields update in DB (verify via manual re-open).
- [ ] **Delete account**: Remove one account → its snapshots deleted by FK cascade,
      remaining accounts unaffected.
- [ ] **Non-logged-in profile**: If a profile path exists but is not logged in,
      it should **not** be auto-imported (check `authenticated == false`).
