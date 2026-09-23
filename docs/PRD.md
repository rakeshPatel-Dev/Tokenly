# Tokenly PRD

## Product

**Tokenly** is a local-first desktop application for developers who
use multiple AI coding agents and multiple accounts.

It solves one specific problem:

> **Which of my AI coding accounts still has quota, and when will that
> quota reset?**

The first release will support only:

1.  **OpenAI Codex CLI**
2.  **Google Antigravity CLI (`agy`)**

Other providers must not be implemented in v1. The architecture should
make future providers possible through isolated adapters.

------------------------------------------------------------------------

# 1. Problem

Developers often use multiple accounts across AI coding tools.

For example:

``` text
Codex
├── personal@gmail.com
├── work@gmail.com
└── college@gmail.com

Antigravity
├── personal@gmail.com
├── project@gmail.com
└── backup@gmail.com
```

Each provider has different authentication, quota windows, reset rules,
and ways of exposing usage.

The user currently has to open each CLI or dashboard separately to
answer:

-   How much quota is left?
-   Which account still has quota?
-   When does the current window reset?
-   Which account should I use for the next task?
-   Is the displayed quota current?
-   Which account is actually connected to this CLI installation?

Tokenly provides one local dashboard for these answers.

------------------------------------------------------------------------

# 2. Product Goal

Create a trustworthy local dashboard that can:

-   Connect multiple Codex accounts.
-   Connect multiple Antigravity accounts.
-   Detect the account identity.
-   Fetch current quota information.
-   Display remaining usage.
-   Display usage windows.
-   Display exact reset timestamps when available.
-   Refresh usage manually and automatically.
-   Show when data was last refreshed.
-   Clearly identify the source of each quota measurement.
-   Keep authentication credentials local to the user's machine.
-   Avoid storing provider passwords in the application's database.

------------------------------------------------------------------------

# 3. Non-Goals

The v1 product will NOT:

-   Manage or change provider subscriptions.
-   Purchase credits.
-   Send prompts through the providers.
-   Act as an AI coding agent.
-   Store provider passwords.
-   Build a hosted SaaS backend.
-   Sync credentials to the cloud.
-   Support every AI coding provider.
-   Scrape provider websites when a supported CLI/API mechanism exists.
-   Attempt to bypass provider authentication or access controls.
-   Circumvent provider rate limits.
-   Automatically switch the user's active provider account without
    explicit user action.

------------------------------------------------------------------------

# 4. Core Product Principle

## Provider adapters

Every provider must be isolated behind an adapter.

``` text
                    Tokenly
                       |
              Provider Adapter
                       |
          +------------+------------+
          |                         |
        Codex                  Antigravity
          |                         |
   Codex app-server            agy CLI
          |                         |
   rateLimits/read          /usage JSON
```

The rest of the application must not care how a provider obtains its
data.

------------------------------------------------------------------------

# 5. Supported Provider #1: Codex

## Integration status

**Status: Excellent**

Codex exposes a machine-readable app-server interface with:

``` text
account/rateLimits/read
```

The current Codex app-server protocol defines rate-limit windows
containing:

-   `usedPercent`
-   `windowDurationMins`
-   `resetsAt`

The response also exposes account and plan information, including
`planType`.

Official Codex source:

https://github.com/openai/codex

Rate-limit response schema:

https://github.com/openai/codex/blob/main/codex-rs/app-server-protocol/schema/json/v2/GetAccountRateLimitsResponse.json

App-server documentation:

https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md

## Planned integration

Tokenly should communicate with the locally installed Codex app-server
rather than scraping the Codex UI.

Conceptually:

``` text
Tokenly
    |
    | start/connect
    v
Codex app-server
    |
    | account/rateLimits/read
    v
JSON response
    |
    v
CodexAdapter
    |
    v
Normalized UsageWindow[]
```

The adapter should consume:

``` text
primary
secondary
rateLimitsByLimitId
planType
accountId
credits
```

where available.

## Important caveat

The app-server rate-limit response is not guaranteed to contain every
possible usage/billing metric for every account type.

For example, there are current reports of certain business/usage-based
accounts returning empty rate-limit windows from
`account/rateLimits/read` even while the web analytics page shows usage.

Therefore:

-   Do not assume `primary != null` means quota exists.
-   Do not infer quota availability from missing data.
-   Preserve an `unknown/unavailable` state.
-   Display the last successful refresh.
-   Keep the adapter isolated so an alternative Codex usage source can
    be added later.

Relevant issue:

https://github.com/openai/codex/issues/24445

------------------------------------------------------------------------

# 6. Codex Authentication

Tokenly should NOT ask the user for their OpenAI password.

Preferred flow:

``` text
Add Account
    |
    v
Codex Adapter
    |
    v
Codex authentication/app-server
    |
    v
Authenticated Codex account
```

The application should prefer using the authentication mechanism
provided by Codex itself.

Where supported, Tokenly can operate against isolated Codex profiles
by using separate `CODEX_HOME` directories.

Conceptually:

``` text
~/.codex-personal/
~/.codex-work/
~/.codex-college/
```

Each profile can represent a separate authenticated account.

The adapter should never copy raw credentials into the application
database.

------------------------------------------------------------------------

# 7. Supported Provider #2: Antigravity (`agy`)

## Integration status

**Status: Excellent**

Antigravity's CLI provides a particularly useful machine-readable
integration.

Current CLI behavior supports:

``` bash
agy --print /usage --output-format json
```

The Antigravity CLI changelog documents structured JSON output for print
mode.

Official repository:

https://github.com/google-antigravity/antigravity-cli

Changelog:

https://github.com/google-antigravity/antigravity-cli/blob/main/CHANGELOG.md

Current CLI quota discussion:

https://github.com/google-antigravity/antigravity-cli/issues/1045

## Planned integration

Tokenly should use the installed `agy` CLI instead of directly
implementing Google's authentication protocol.

Conceptually:

``` text
Tokenly
    |
    | execute
    v
agy --print /usage --output-format json
    |
    v
JSON
    |
    v
AntigravityAdapter
    |
    v
Normalized UsageWindow[]
```

The known structured usage data includes concepts such as:

``` text
groups
buckets
window
remaining_fraction
reset_time
```

Tokenly should parse the actual JSON schema returned by the installed
`agy` version rather than assuming a permanently fixed response shape.

------------------------------------------------------------------------

# 8. Antigravity Authentication

Tokenly should NOT request or store the user's Google password.

Preferred approach:

``` text
Tokenly
    |
    v
agy authentication
    |
    v
OS credential/keyring
    |
    v
authenticated agy account
```

The first implementation should rely on `agy` being installed and
authenticated.

Tokenly can then invoke the CLI and consume its structured output.

This avoids directly handling Google OAuth credentials.

------------------------------------------------------------------------

# 9. Antigravity Account Identity

The adapter must identify which Google account is being queried.

This is critical because:

``` text
agy account A
```

and:

``` text
agy account B
```

may have completely different quotas.

The UI should therefore never display only:

``` text
Antigravity
```

It should display something like:

``` text
Antigravity
personal@gmail.com
```

If the CLI does not provide a reliable account identity in the usage
response, the adapter must obtain identity through another
supported/local mechanism.

If identity cannot be verified, the account should be marked:

``` text
Identity unverified
```

rather than silently assigning the wrong Gmail address.

------------------------------------------------------------------------

# 10. Multi-Account Model

The application must treat accounts independently.

Example:

``` text
Codex

Personal
personal@gmail.com

Work
work@gmail.com

College
college@gmail.com
```

and:

``` text
Antigravity

Personal
personal@gmail.com

Project
project@gmail.com
```

An account is NOT simply an email address.

The canonical identity should be:

``` text
provider + providerAccountId
```

when a provider account ID is available.

Email should be treated as display metadata.

------------------------------------------------------------------------

# 11. Data Model

## Account

``` ts
interface Account {
  id: string;

  provider:
    | "codex"
    | "antigravity";

  providerAccountId?: string;

  email?: string;

  displayName?: string;

  plan?: string;

  authProfileId: string;

  enabled: boolean;

  lastCheckedAt?: string;

  createdAt: string;

  updatedAt: string;
}
```

## Usage Window

``` ts
interface UsageWindow {
  id: string;

  accountId: string;

  name: string;

  type:
    | "session"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "custom";

  usedPercent?: number;

  remainingPercent?: number;

  used?: number;

  limit?: number;

  resetAt?: string;

  source:
    | "official_cli"
    | "official_app_server";

  fetchedAt: string;
}
```

## Provider Adapter

``` ts
interface ProviderAdapter {
  id: "codex" | "antigravity";

  name: string;

  detect(): Promise<boolean>;

  discoverAccounts(): Promise<Account[]>;

  authenticate(): Promise<Account>;

  getAccountInfo(account: Account): Promise<Account>;

  getUsage(account: Account): Promise<UsageWindow[]>;

  disconnect(account: Account): Promise<void>;
}
```

------------------------------------------------------------------------

# 12. Storage

Tokenly should be local-first.

Recommended:

``` text
SQLite
```

for application data.

Store:

``` text
accounts
usage_snapshots
settings
provider_metadata
```

Do NOT store:

``` text
provider_password
raw_oauth_password
```

Sensitive authentication material should use the operating system
credential/keyring facility whenever the provider integration requires
storing a secret.

Recommended conceptual architecture:

``` text
SQLite
    |
    +-- account metadata
    +-- usage history
    +-- settings
    +-- provider state

OS Keychain / Credential Manager
    |
    +-- sensitive provider credentials
```

------------------------------------------------------------------------

# 13. Usage Refresh

Quota data is time-sensitive.

The application should support:

### Manual refresh

``` text
[ Refresh ]
```

### Automatic refresh

Recommended initial behavior:

``` text
Foreground:
every 60 seconds

Background:
every 5 minutes
```

The exact interval should be configurable.

Do not refresh aggressively because some provider mechanisms may involve
process startup or network requests.

Each result should contain:

``` text
fetchedAt
```

and the UI should display:

``` text
Updated 18 seconds ago
```

------------------------------------------------------------------------

# 14. Dashboard

The main dashboard should prioritize the user's actual question:

> Which account can I use right now?

Example:

``` text
┌─────────────────────────────────────────────────────┐
│ Tokenly                              + Add Account │
├─────────────────────────────────────────────────────┤
│                                                     │
│ CODEX                                               │
│                                                     │
│ Personal · personal@gmail.com                       │
│ ████████████████░░░░  82% remaining                 │
│ 5-hour window · resets in 1h 42m                    │
│                                                     │
│ Weekly · 71% remaining                              │
│ resets in 3d 12h                                    │
│                                                     │
│ ✓ Updated 12 seconds ago                            │
│ Source: Codex app-server                            │
│                                                     │
├─────────────────────────────────────────────────────┤
│ ANTIGRAVITY                                         │
│                                                     │
│ Work · work@gmail.com                               │
│ ███████████░░░░░░░░  56% remaining                 │
│ 5-hour window · resets in 2h 11m                    │
│                                                     │
│ ✓ Updated 24 seconds ago                            │
│ Source: agy CLI                                     │
└─────────────────────────────────────────────────────┘
```

------------------------------------------------------------------------

# 15. Account Detail

Clicking an account should show:

``` text
Provider
Account email
Plan
Provider account ID, if available

Current usage windows

Usage history

Last successful refresh

Data source

Connection status

[ Refresh ]

[ Disconnect ]
```

------------------------------------------------------------------------

# 16. Unknown / Error States

Never turn missing data into fake zeroes.

Bad:

``` text
Remaining: 0%
```

when the provider failed to return usage.

Good:

``` text
Usage unavailable

Last successful update:
14:23

Reason:
Provider did not return rate-limit data.
```

Possible states:

``` text
connected
refreshing
stale
error
unauthenticated
unsupported
unavailable
identity_unverified
```

------------------------------------------------------------------------

# 17. Usage History

The application should store snapshots so the user can see how quickly
quota is being consumed.

Example:

``` text
Today

10:00   100%
11:00    87%
12:00    63%
13:00    41%
14:00    28%
```

This enables future features such as:

-   usage velocity
-   estimated exhaustion time
-   historical charts
-   daily consumption
-   account comparison

These are NOT required for the initial MVP UI.

------------------------------------------------------------------------

# 18. Reset Handling

The application should use the provider's actual `resetAt` value
whenever available.

Do not hard-code:

``` text
Codex resets every 5 hours
```

as the sole logic.

Instead:

``` text
resetAt = provider supplied timestamp
```

Then calculate:

``` ts
timeRemaining = resetAt - now
```

Display:

``` text
Resets in 2h 14m
```

and:

``` text
Resets Sep 23, 2026 at 4:30 PM
```

If the provider gives only a reset date and no timestamp, display the
If the provider gives only a reset date and no timestamp, display the
appropriate lower precision.

------------------------------------------------------------------------

# 19. Provider Source Transparency

Every usage card must show its source.

Examples:

``` text
Source: Codex app-server
```

or:

``` text
Source: agy CLI
```

This is important because future providers may require less reliable
mechanisms.

The user should always know whether the number came from:

``` text
Official API
Official CLI
Official app-server
Internal web API
Local estimate
```

For v1, only the first three should be accepted.

------------------------------------------------------------------------

# 20. Security Requirements

## Absolute requirements

1.  Never ask for provider passwords.
2.  Never send provider credentials to a Tokenly server.
3.  No cloud authentication service is required for v1.
4.  Keep the database local.
5.  Use OS credential storage for sensitive secrets.
6.  Do not log access tokens.
7.  Do not log raw authentication responses.
8.  Redact credentials from errors.
9.  Do not include credentials in crash reports.
10. Provide a complete account disconnect/removal operation.

------------------------------------------------------------------------

# 21. Desktop Architecture

Recommended stack:

``` text
Desktop shell:
Tauri

Frontend:
React
TypeScript
Tailwind CSS
shadcn/ui

Local backend:
Rust/Tauri commands

Database:
SQLite

Credential storage:
OS keychain / credential manager

Provider integrations:
Codex app-server
agy CLI
```

The reason for using a desktop architecture is that the application
needs access to:

-   locally installed CLIs
-   local authentication state
-   OS credential storage
-   local filesystem
-   background refresh
-   system notifications

A browser-only application is the wrong architecture for the full
version.

------------------------------------------------------------------------

# 22. Provider Adapter Isolation

Directory structure:

``` text
src/
  providers/
    codex/
      adapter.ts
      client.ts
      parser.ts
      types.ts

    antigravity/
      adapter.ts
      client.ts
      parser.ts
      types.ts

  core/
    accounts/
    usage/
    refresh/
    notifications/

  database/
    schema/
    repositories/

  ui/
    components/
    pages/
```

Provider-specific code must never leak into generic UI components.

Bad:

``` ts
if (provider === "codex") {
  ...
}
```

throughout the UI.

Good:

``` ts
const usage = await provider.getUsage(account);
```

------------------------------------------------------------------------

# 23. Codex Adapter Requirements

The Codex adapter must:

1.  Detect whether Codex is installed.
2.  Detect whether the app-server is available.
3.  Detect authentication state.
4.  Identify the authenticated account.
5.  Request `account/rateLimits/read`.
6.  Parse `primary`.
7.  Parse `secondary`.
8.  Parse `rateLimitsByLimitId` where available.
9.  Parse `planType`.
10. Parse credit information where available.
11. Parse reset timestamps.
12. Preserve unknown/null values.
13. Return a normalized `UsageWindow[]`.
14. Surface provider errors without exposing credentials.

The adapter must not assume every account returns the same fields.

------------------------------------------------------------------------

# 24. Antigravity Adapter Requirements

The Antigravity adapter must:

1.  Detect whether `agy` is installed.
2.  Detect the installed CLI version.
3.  Detect whether the user is authenticated.
4.  Identify the authenticated Google account.
5.  Execute:

``` bash
agy --print /usage --output-format json
```

6.  Capture stdout.
7.  Parse JSON.
8.  Extract usage groups.
9.  Extract quota buckets.
10. Extract remaining fractions.
11. Extract reset timestamps.
12. Normalize all buckets into `UsageWindow[]`.
13. Handle unknown future bucket types.
14. Surface CLI errors.
15. Never log OAuth credentials.

The parser must be tolerant of additional fields being added by future
versions.

------------------------------------------------------------------------

# 25. Version Compatibility

Provider CLIs can change.

The adapter should record:

``` text
providerVersion
```

for every refresh.

Example:

``` text
Antigravity 1.2.6
Codex 0.130.0
```

If parsing fails after an update:

``` text
Antigravity integration needs attention.

Detected version: 1.3.0
Last successful version: 1.2.6
```

This will make debugging much easier.

------------------------------------------------------------------------

# 26. Source Reliability Policy

For v1:

### Codex

Preferred:

``` text
Codex app-server
```

### Antigravity

Preferred:

``` text
agy --print /usage --output-format json
```

Do not implement undocumented web scraping in v1.

If an official/CLI source becomes unavailable, show:

``` text
Usage unavailable
```

rather than silently switching to a fragile scraping method.

------------------------------------------------------------------------

# 27. MVP Features

## Must have

-   [ ] Desktop application
-   [ ] SQLite
-   [ ] Add Codex account
-   [ ] Add Antigravity account
-   [ ] Account identity
-   [ ] Account list
-   [ ] Usage display
-   [ ] Remaining percentage
-   [ ] Reset time
-   [ ] Manual refresh
-   [ ] Automatic refresh
-   [ ] Last updated timestamp
-   [ ] Connection status
-   [ ] Disconnect account
-   [ ] Secure credential handling
-   [ ] Provider version detection
-   [ ] Error states
-   [ ] Provider source indicator

## Nice to have

-   [ ] Usage history
-   [ ] System tray
-   [ ] Notifications
-   [ ] Low-quota warning
-   [ ] Reset notification
-   [ ] "Next available account" view
-   [ ] Compact desktop widget

## Not v1

-   Cursor
-   Claude Code
-   Gemini CLI
-   OpenCode
-   Kiro
-   GitHub Copilot
-   Cloud synchronization
-   Team accounts
-   Mobile application

------------------------------------------------------------------------

# 28. Future Provider Strategy

Future providers should be added only after verifying that there is a
legitimate and sufficiently stable data source.

Potential future adapters:

``` text
Cursor
Claude Code
GitHub Copilot
Kiro
Gemini CLI
OpenCode
Qwen Code
```

Each provider must pass the following test before being supported:

``` text
1. Can we authenticate without collecting passwords?
2. Can we reliably identify the account?
3. Can we retrieve usage?
4. Can we retrieve reset information?
5. Is the mechanism sufficiently stable?
6. Does the provider permit this integration?
7. Can failures be represented honestly?
```

If any answer is "no", the provider should not be marked as fully
supported.

------------------------------------------------------------------------

# 29. Success Criteria

The MVP is successful when a user can:

1.  Install Tokenly.
2.  Add multiple Codex accounts.
3.  Add multiple Antigravity accounts.
4.  See every account in one dashboard.
5.  See current quota for each account.
6.  See the next reset time.
7.  Refresh all accounts.
8.  See when each result was last checked.
9.  Identify which provider account the quota belongs to.
10. Disconnect an account without deleting unrelated accounts.
11. Use the application without creating a Tokenly cloud account.

Example:

``` text
                    Tokenly

Codex
────────────────────────────────────────
personal@gmail.com       82%   🟢
work@gmail.com           14%   🔴
college@gmail.com        57%   🟡

Antigravity
────────────────────────────────────────
personal@gmail.com       76%   🟢
project@gmail.com        31%   🟡

Next reset:
Codex · work@gmail.com
in 18 minutes
```

------------------------------------------------------------------------

# 30. Product Philosophy

Tokenly should optimize for:

**Accuracy \> number of providers**

**Security \> convenience**

**Official interfaces \> scraping**

**Transparent failures \> fabricated data**

**Local-first \> cloud-first**

The application should never claim:

> "You have 80% quota remaining"

when the provider did not actually return reliable information.

It should instead say:

> "Usage unavailable. Last successful check: 14 minutes ago."

That principle is more important than supporting 20 providers.

------------------------------------------------------------------------

# 31. Initial Development Order

## Phase 1: Foundation

-   Tauri + React + TypeScript
-   SQLite
-   secure credential abstraction
-   provider adapter interface
-   account repository
-   usage repository

## Phase 2: Codex

-   detect Codex
-   authenticate
-   connect to app-server
-   `account/read`
-   `account/rateLimits/read`
-   parse response
-   display usage
-   multi-profile testing

## Phase 3: Antigravity

-   detect `agy`
-   version detection
-   authentication detection
-   execute `/usage` in print mode
-   JSON parsing
-   account identity
-   usage display
-   multi-account testing

## Phase 4: Reliability

-   refresh scheduler
-   error handling
-   stale data handling
-   version compatibility
-   logging/redaction
-   provider health state

## Phase 5: UX

-   dashboard
-   account cards
-   reset countdown
-   low-quota indicators
-   notifications
-   system tray

------------------------------------------------------------------------

# 32. Research References

## Codex

OpenAI Codex repository:

https://github.com/openai/codex

Codex app-server README:

https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md

Codex rate-limit response schema:

https://github.com/openai/codex/blob/main/codex-rs/app-server-protocol/schema/json/v2/GetAccountRateLimitsResponse.json

Codex rate-limit implementation/tests:

https://github.com/openai/codex/tree/main/codex-rs/app-server

Codex issue documenting edge cases where rate-limit data can be
unavailable:

https://github.com/openai/codex/issues/24445

## Antigravity / agy

Official Antigravity CLI repository:

https://github.com/google-antigravity/antigravity-cli

Antigravity CLI changelog:

https://github.com/google-antigravity/antigravity-cli/blob/main/CHANGELOG.md

Antigravity quota/usage issue:

https://github.com/google-antigravity/antigravity-cli/issues/590

Antigravity ACP quota discussion:

https://github.com/google-antigravity/antigravity-cli/issues/1045

Example independent quota checker demonstrating structured quota
retrieval:

https://github.com/tingyi365/agy-quota

------------------------------------------------------------------------

# 33. Final Technical Decision

For v1, Tokenly will support exactly:

``` text
┌──────────────────────────────────────┐
│              Tokenly               │
├──────────────────────────────────────┤
│                                      │
│  OpenAI Codex                        │
│  └── Codex app-server                │
│      └── account/rateLimits/read     │
│                                      │
│  Google Antigravity                  │
│  └── agy CLI                         │
│      └── /usage                      │
│          └── JSON output             │
│                                      │
└──────────────────────────────────────┘
```

No scraping.

No password collection.

No cloud credential storage.

No unnecessary provider integrations.

Build the provider abstraction correctly first, then add providers only
when their usage data can be obtained through a sufficiently reliable
and legitimate mechanism.

