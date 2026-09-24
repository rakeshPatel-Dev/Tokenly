import { useEffect, useMemo, useState } from "react"
import {
  detectOs,
  fetchLatestRelease,
  preferredDownload,
  type DownloadOption,
} from "@/lib/downloads"

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":")
}

export function useLatestRelease() {
  const os = useMemo(() => detectOs(), [])
  const [downloads, setDownloads] = useState<DownloadOption[] | null>(null)
  const [tag, setTag] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchLatestRelease()
      .then((release) => {
        if (cancelled) return
        if (!release) {
          setFailed(true)
          return
        }
        setDownloads(release.downloads)
        setTag(release.tag)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const primary = useMemo(
    () => (downloads ? preferredDownload(os, downloads) : null),
    [os, downloads],
  )

  return { primary, downloads, tag, failed }
}

export function useNextReset() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const nextReset = useMemo(() => {
    const d = new Date(now)
    d.setHours(24, 0, 0, 0)
    return d.getTime()
  }, [now])
  return formatCountdown(nextReset - now)
}

export function useReveal() {
  useEffect(() => {
    document.documentElement.classList.add("js")
    const els = Array.from(document.querySelectorAll("[data-reveal]"))
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add("is-in")
          io.unobserve(entry.target)
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    )
    for (const el of els) io.observe(el)
    return () => io.disconnect()
  }, [])
}