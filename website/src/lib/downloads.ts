export const GITHUB_REPO = "rakeshPatel-Dev/Tokenly"
export const RELEASES_PAGE = `https://github.com/${GITHUB_REPO}/releases`
export const LATEST_RELEASE_PAGE = `https://github.com/${GITHUB_REPO}/releases/latest`

export type PlatformId =
  | "windows"
  | "macos-arm"
  | "macos-intel"
  | "linux-appimage"
  | "linux-deb"
  | "linux-rpm"

export type DownloadOption = {
  id: PlatformId
  os: "windows" | "macos" | "linux"
  label: string
  detail: string
  filename: string
  url: string
}

type AssetMatch = {
  id: PlatformId
  os: DownloadOption["os"]
  label: string
  detail: string
  test: (name: string) => boolean
}

const ASSET_MATCHERS: AssetMatch[] = [
  {
    id: "windows",
    os: "windows",
    label: "Windows",
    detail: "x64 installer (.exe)",
    test: (n) => /x64-setup\.exe$/i.test(n) || /_x64_en-US\.msi$/i.test(n),
  },
  {
    id: "macos-arm",
    os: "macos",
    label: "macOS",
    detail: "Apple Silicon (.dmg)",
    test: (n) => /aarch64\.dmg$/i.test(n),
  },
  {
    id: "macos-intel",
    os: "macos",
    label: "macOS",
    detail: "Intel (.dmg)",
    test: (n) => /x64\.dmg$/i.test(n),
  },
  {
    id: "linux-appimage",
    os: "linux",
    label: "Linux",
    detail: "AppImage (amd64)",
    test: (n) => /\.AppImage$/i.test(n) && !/\.sig$/i.test(n),
  },
  {
    id: "linux-deb",
    os: "linux",
    label: "Linux",
    detail: "Debian / Ubuntu (.deb)",
    test: (n) => /\.deb$/i.test(n),
  },
  {
    id: "linux-rpm",
    os: "linux",
    label: "Linux",
    detail: "Fedora / RHEL (.rpm)",
    test: (n) => /\.rpm$/i.test(n),
  },
]

type GhAsset = { name: string; browser_download_url: string }
type GhRelease = { tag_name: string; assets: GhAsset[] }

export type LatestRelease = {
  tag: string
  downloads: DownloadOption[]
}

export async function fetchLatestRelease(): Promise<LatestRelease | null> {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
    { headers: { Accept: "application/vnd.github+json" } },
  )
  if (!res.ok) return null
  const data = (await res.json()) as GhRelease
  const downloads: DownloadOption[] = []
  for (const match of ASSET_MATCHERS) {
    const asset = data.assets.find((a) => match.test(a.name))
    if (!asset) continue
    downloads.push({
      id: match.id,
      os: match.os,
      label: match.label,
      detail: match.detail,
      filename: asset.name,
      url: asset.browser_download_url,
    })
  }
  return downloads.length ? { tag: data.tag_name, downloads } : null
}

export type DetectedOs = "windows" | "macos" | "linux" | "unknown"

export function detectOs(): DetectedOs {
  if (typeof navigator === "undefined") return "unknown"
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes("windows")) return "windows"
  if (ua.includes("mac")) return "macos"
  if (ua.includes("linux") || ua.includes("x11")) return "linux"
  return "unknown"
}

export function preferredDownload(
  os: DetectedOs,
  downloads: DownloadOption[],
): DownloadOption | null {
  if (!downloads.length) return null
  if (os === "windows")
    return downloads.find((d) => d.id === "windows") ?? downloads[0]!
  if (os === "macos") {
    const arm =
      typeof navigator !== "undefined" &&
      (navigator.userAgent.includes("ARM") ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))
    return (
      downloads.find((d) => d.id === (arm ? "macos-arm" : "macos-intel")) ??
      downloads.find((d) => d.os === "macos") ??
      downloads[0]!
    )
  }
  if (os === "linux")
    return (
      downloads.find((d) => d.id === "linux-appimage") ??
      downloads.find((d) => d.os === "linux") ??
      downloads[0]!
    )
  return downloads[0]!
}
