export const GITHUB_REPO = "rakeshPatel-Dev/Tokenly"
export const RELEASE_TAG = "v0.1.0"
export const APP_VERSION = "0.1.0"

const releaseAsset = (filename: string) =>
  `https://github.com/${GITHUB_REPO}/releases/download/${RELEASE_TAG}/${filename}`

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

export const DOWNLOADS: DownloadOption[] = [
  {
    id: "windows",
    os: "windows",
    label: "Windows",
    detail: "x64 installer (.exe)",
    filename: `Tokenly_${APP_VERSION}_x64-setup.exe`,
    url: releaseAsset(`Tokenly_${APP_VERSION}_x64-setup.exe`),
  },
  {
    id: "macos-arm",
    os: "macos",
    label: "macOS",
    detail: "Apple Silicon (.dmg)",
    filename: `Tokenly_${APP_VERSION}_aarch64.dmg`,
    url: releaseAsset(`Tokenly_${APP_VERSION}_aarch64.dmg`),
  },
  {
    id: "macos-intel",
    os: "macos",
    label: "macOS",
    detail: "Intel (.dmg)",
    filename: `Tokenly_${APP_VERSION}_x64.dmg`,
    url: releaseAsset(`Tokenly_${APP_VERSION}_x64.dmg`),
  },
  {
    id: "linux-appimage",
    os: "linux",
    label: "Linux",
    detail: "AppImage (amd64)",
    filename: `Tokenly_${APP_VERSION}_amd64.AppImage`,
    url: releaseAsset(`Tokenly_${APP_VERSION}_amd64.AppImage`),
  },
  {
    id: "linux-deb",
    os: "linux",
    label: "Linux",
    detail: "Debian / Ubuntu (.deb)",
    filename: `Tokenly_${APP_VERSION}_amd64.deb`,
    url: releaseAsset(`Tokenly_${APP_VERSION}_amd64.deb`),
  },
  {
    id: "linux-rpm",
    os: "linux",
    label: "Linux",
    detail: "Fedora / RHEL (.rpm)",
    filename: `Tokenly-${APP_VERSION}-1.x86_64.rpm`,
    url: releaseAsset(`Tokenly-${APP_VERSION}-1.x86_64.rpm`),
  },
]

export type DetectedOs = "windows" | "macos" | "linux" | "unknown"

export function detectOs(): DetectedOs {
  if (typeof navigator === "undefined") return "unknown"
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes("windows")) return "windows"
  if (ua.includes("mac")) return "macos"
  if (ua.includes("linux") || ua.includes("x11")) return "linux"
  return "unknown"
}

export function preferredDownload(os: DetectedOs): DownloadOption {
  if (os === "windows") return DOWNLOADS.find((d) => d.id === "windows")!
  if (os === "macos") {
    const arm =
      typeof navigator !== "undefined" &&
      (navigator.userAgent.includes("ARM") ||
        // Apple Silicon browsers report MacIntel but can use maxTouchPoints hint
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))
    return DOWNLOADS.find((d) => d.id === (arm ? "macos-arm" : "macos-intel"))!
  }
  if (os === "linux") return DOWNLOADS.find((d) => d.id === "linux-appimage")!
  return DOWNLOADS[0]!
}
