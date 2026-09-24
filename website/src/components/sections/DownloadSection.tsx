import { Download, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { OsIcon } from "@/components/OsIcon"
import { useLatestRelease } from "@/lib/hooks"
import { LATEST_RELEASE_PAGE } from "@/lib/downloads"

export function DownloadSection() {
  const { primary, downloads, tag, failed } = useLatestRelease()

  return (
    <section id="download" className="border-b border-border">
      <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        <h2 className="l-type-2 max-w-xl text-3xl font-semibold sm:text-4xl">
          Know what’s left, before the CLI does.
        </h2>
        <div data-reveal className="mt-10 max-w-lg">
          {primary ? (
            <Button size="lg" className="w-full" asChild>
              <a href={primary.url}>
                <Download data-icon="inline-start" />
                Download for {primary.label}
              </a>
            </Button>
          ) : failed ? (
            <Button size="lg" className="w-full" asChild>
              <a href={LATEST_RELEASE_PAGE}>
                <Download data-icon="inline-start" />
                View releases on GitHub
              </a>
            </Button>
          ) : (
            <Button size="lg" className="w-full" disabled>
              Loading downloads…
            </Button>
          )}
          <p className="mx-6 mt-3 text-center text-xs text-muted-foreground">
            {primary
              ? `${primary.detail}${tag ? ` · ${tag}` : ""}`
              : "Free, open source, local-first."}
          </p>
        </div>

        <div className="mt-14">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-medium">All platforms</p>
            <a
              href={LATEST_RELEASE_PAGE}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              GitHub releases
              <ExternalLink className="size-3" />
            </a>
          </div>
          <Separator className="mb-3" />
          {downloads ? (
            <ul className="divide-y divide-border">
              {downloads.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 py-3.5"
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
                    variant={item.id === primary?.id ? "default" : "outline"}
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
          ) : (
            <p className="py-3 text-sm text-muted-foreground">
              {failed
                ? "Could not load release assets."
                : "Fetching latest release…"}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}