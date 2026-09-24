import { Download, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLatestRelease } from "@/lib/hooks"
import { LATEST_RELEASE_PAGE } from "@/lib/downloads"

export function Hero() {
  const { primary, tag, failed } = useLatestRelease()

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
        <p className="text-sm text-muted-foreground">
          A local countdown for the AI credits you already pay for
        </p>
        <h1 className="l-type-1 mt-6 text-balance text-[2.6rem] font-semibold sm:text-6xl">
          Codex and Antigravity credits,{" "}
          <a href="#watch" className="dotted-link hover:text-accent">
            every window
          </a>
          ,{" "}
          <a href="#compare" className="dotted-link hover:text-accent">
            every reset
          </a>
          , in one local app.
        </h1>
        <p className="l-type-3 mt-8 max-w-xl text-pretty text-lg text-muted-foreground">
          Tokenly reads the quotas your local CLIs already know and keeps a
          live view of every usage window — hourly, monthly, rolling — with a
          quiet countdown to each reset. It runs on your machine, watches
          quietly, and only speaks when a limit moves.
        </p>
        <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          {primary ? (
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <a href={primary.url}>
                <Download data-icon="inline-start" />
                Download for {primary.label}
              </a>
            </Button>
          ) : failed ? (
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <a href={LATEST_RELEASE_PAGE}>
                <Download data-icon="inline-start" />
                View releases on GitHub
              </a>
            </Button>
          ) : (
            <Button size="lg" disabled className="w-full sm:w-auto">
              Loading download…
            </Button>
          )}
          <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
            <a href="#watch">
              <Terminal data-icon="inline-start" />
              See it run
            </a>
          </Button>
        </div>
        <p className="mt-4 min-h-5 text-xs text-muted-foreground">
          {primary && tag ? (
            <>
              {primary.detail} · {tag}
            </>
          ) : (
            "\u00A0"
          )}
        </p>
      </div>
    </section>
  )
}