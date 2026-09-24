import { GITHUB_REPO, LATEST_RELEASE_PAGE } from "@/lib/downloads"

export function Footer() {
  return (
    <footer>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-6 py-14 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <img src="/tokenly.svg" alt="" className="size-7 rounded-md" />
            <span className="text-[15px] font-semibold tracking-tight">
              Tokenly
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Local-first credit tracker for Codex and Antigravity. Free, open
            source, and offline by default.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium">Download</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <a href="#download" className="hover:text-foreground">
                macOS
              </a>
            </li>
            <li>
              <a href="#download" className="hover:text-foreground">
                Windows
              </a>
            </li>
            <li>
              <a href="#download" className="hover:text-foreground">
                Linux
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium">Project</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <a
                href={`https://github.com/${GITHUB_REPO}`}
                className="hover:text-foreground"
              >
                Source on GitHub
              </a>
            </li>
            <li>
              <a
                href={LATEST_RELEASE_PAGE}
                className="hover:text-foreground"
              >
                Releases
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-5xl px-6 py-5 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Tokenly. Your credits, on your machine.
        </p>
      </div>
    </footer>
  )
}