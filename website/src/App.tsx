import { useMemo } from "react"
import { Apple, Download, Monitor, Terminal } from "lucide-react"
import { Analytics } from "@vercel/analytics/react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  DOWNLOADS,
  LATEST_RELEASE_PAGE,
  detectOs,
  preferredDownload,
  type DownloadOption,
} from "@/lib/downloads"

function OsIcon({ os }: { os: DownloadOption["os"] }) {
  if (os === "macos") return <Apple className="size-4" />
  if (os === "linux") return <Terminal className="size-4" />
  return <Monitor className="size-4" />
}

export default function App() {
  const os = useMemo(() => detectOs(), [])
  const primary = useMemo(() => preferredDownload(os), [os])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-6 py-16 text-foreground">
      <div className="flex max-w-lg flex-col items-center gap-5 text-center">
        <img
          src="/tokenly.svg"
          alt="Tokenly"
          className="size-16 rounded-2xl"
        />
        <div>
          <h1 className="font-heading text-4xl font-semibold tracking-tight">
            Tokenly
          </h1>
          <p className="mt-2 text-balance text-muted-foreground">
            Local-first desktop app to track AI quotas across Codex and
            Antigravity.
          </p>
        </div>

        <div className="flex w-full max-w-sm flex-col gap-2">
          <Button size="lg" className="w-full" asChild>
            <a href={primary.url}>
              <Download data-icon="inline-start" />
              Download for {primary.label}
            </a>
          </Button>
          <p className="text-xs text-muted-foreground">{primary.detail}</p>
        </div>
      </div>

      <div className="w-full max-w-lg">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-medium">All platforms</p>
          <a
            href={LATEST_RELEASE_PAGE}
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            GitHub releases
          </a>
        </div>
        <Separator className="mb-3" />
        <ul className="divide-y divide-border">
          {DOWNLOADS.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3 text-left">
                <span className="text-muted-foreground">
                  <OsIcon os={item.os} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
              </div>
              <Button
                variant={item.id === primary.id ? "default" : "outline"}
                size="sm"
                asChild
              >
                <a href={item.url}>
                  <Download data-icon="inline-start" />
                  Download
                </a>
              </Button>
            </li>
          ))}
        </ul>
      </div>
      <Analytics />
    </div>
  )
}
