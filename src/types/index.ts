export type ProviderType = "codex" | "antigravity";

export type WindowType = "session" | "hourly" | "daily" | "weekly" | "monthly" | "custom";

export type WindowSource = "official_cli" | "official_app_server";

export type ConnectionStatus =
  | "connected"
  | "refreshing"
  | "stale"
  | "error"
  | "unauthenticated"
  | "unsupported"
  | "unavailable"
  | "identity_unverified";

export interface Account {
  id: string;
  provider: ProviderType;
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

export interface UsageWindow {
  id: string;
  accountId: string;
  name: string;
  windowType: WindowType;
  usedPercent?: number;
  remainingPercent?: number;
  used?: number;
  limit?: number;
  resetAt?: string;
  source: WindowSource;
  fetchedAt: string;
}

export interface ProviderMetadata {
  provider: ProviderType;
  installed: boolean;
  version?: string;
  lastSuccessfulVersion?: string;
  status: string;
  statusMessage?: string;
  updatedAt: string;
}
