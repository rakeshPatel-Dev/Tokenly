const STACK: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Read",
    body: "Detects your local Codex and Antigravity CLI profiles and their auth, without you configuring anything.",
  },
  {
    n: "02",
    title: "Track",
    body: "Snapshots each quota into a local, per-machine store. Nothing about your usage leaves the device.",
  },
  {
    n: "03",
    title: "Schedule",
    body: "Syncs on its own — foreground and background — and stays quiet when nothing changed.",
  },
  {
    n: "04",
    title: "Stay out of the way",
    body: "Lives in the tray, opens on demand, and only raises its voice when a reset is near or a limit is low.",
  },
]

export function StackSection() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        <h2 className="l-type-2 max-w-xl text-3xl font-semibold sm:text-4xl">
          Built to watch quietly on your machine.
        </h2>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2">
          {STACK.map((s, i) => (
            <div
              key={s.n}
              data-reveal
              className={`border-b border-t-0 border-border p-8 sm:p-10 ${
                i % 2 === 1 ? "sm:border-l" : ""
              } ${i >= 2 ? "border-b sm:border-b-0" : ""}`}
            >
              <span className="font-mono text-sm text-accent">{s.n}</span>
              <h3 className="l-type-2 mt-3 text-xl font-semibold">{s.title}</h3>
              <p className="l-type-3 mt-3 max-w-sm text-pretty text-muted-foreground">
                {s.body}
              </p>
            </div>
          ))}
          <div className="hidden sm:block" />
        </div>
      </div>
    </section>
  )
}