import { GitBranch } from "lucide-react"
import { useNextReset } from "@/lib/hooks"

export function ResetSection() {
  const nextReset = useNextReset()
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-5xl grid-cols-1 sm:grid-cols-2">
        <div data-reveal className="order-2 flex flex-col justify-center gap-8 border-t border-border p-8 sm:order-1 sm:border-r sm:border-t-0 sm:p-12">
          <h2 className="l-type-2 max-w-md text-3xl font-semibold">
            Watching credits is a 24/7 job. Tokenly does it for you.
          </h2>
          <p className="l-type-3 max-w-md text-lg text-muted-foreground">
            Hourly windows refill on the hour. Monthly buckets reset on the
            first. Rolling windows roll. Tokenly tracks each one and tells you
            how long until the meter turns back over — so “out of credits”
            never surprises you again.
          </p>
        </div>
        <div data-reveal className="order-1 flex items-center sm:order-2">
          <div className="w-full p-8 sm:p-12">
            <div className="bg-foreground text-background">
              <div className="dot-grid-light px-6 py-8 sm:px-8">
                <p className="font-mono text-xs text-background/50">
                  next codex reset
                </p>
                <p className="l-type-1 mt-3 font-mono text-5xl font-semibold tabular-nums sm:text-6xl">
                  {nextReset}
                </p>
                <div className="mt-8 flex items-center gap-2 font-mono text-xs text-background/60">
                  <GitBranch className="size-3.5" />
                  hourly · in your local timezone
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}