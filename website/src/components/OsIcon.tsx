import { Apple, Monitor, Terminal } from "lucide-react"
import type { DownloadOption } from "@/lib/downloads"

export function OsIcon({ os }: { os: DownloadOption["os"] }) {
  if (os === "macos") return <Apple className="size-4" />
  if (os === "linux") return <Terminal className="size-4" />
  return <Monitor className="size-4" />
}