export function ProblemSection() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-5xl grid-cols-1 sm:grid-cols-2">
        <div data-reveal className="border-b border-border p-8 sm:border-r sm:border-b-0 sm:p-12">
          <h2 className="l-type-2 max-w-md text-3xl font-semibold">
            Your quota lives in a chat window you have to chase.
          </h2>
        </div>
        <div data-reveal className="flex flex-col justify-center gap-8 p-8 sm:p-12">
          <p className="l-type-3 max-w-md text-lg text-muted-foreground">
            Mid-task, the CLI stops. “Rate limit exceeded — try again in 1h
            4m.” By the time you check the web console, the moment is gone.
          </p>
          <div className="border border-border bg-card px-5 py-4 font-mono text-sm">
            <p className="text-muted-foreground">$ codex exec "refactor"</p>
            <p className="mt-2 text-foreground">
              <span className="text-destructive">429</span> rate limit
              exceeded — try again in <span className="text-foreground">1h 4m</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}