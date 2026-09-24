import { GitBranch } from "lucide-react"
import { GITHUB_REPO } from "@/lib/downloads"

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-6">
        <a href="#top" className="flex items-center gap-2.5">
          <img src="/tokenly.svg" alt="" className="size-7 rounded-md" />
          <span className="text-[15px] font-semibold tracking-tight">
            Tokenly
          </span>
        </a>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          <a href="#watch" className="hover:text-foreground">
            Watch
          </a>
          <a href="#compare" className="hover:text-foreground">
            Compare
          </a>
          <a href="#download" className="hover:text-foreground">
            Download
          </a>
        </nav>
        <a
          href={`https://github.com/${GITHUB_REPO}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <GitBranch className="size-4" />
          <span className="hidden sm:inline">View source</span>
        </a>
      </div>
    </header>
  )
}