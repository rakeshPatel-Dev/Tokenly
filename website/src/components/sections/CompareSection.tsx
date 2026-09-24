const COMPARE: { feature: string; before: string; after: string }[] = [
  {
    feature: "Used / total readout",
    before: "Only the window that’s empty",
    after: "Every plan window, live",
  },
  {
    feature: "Reset countdown",
    before: "No such thing",
    after: "Live, per window",
  },
  {
    feature: "Low-credit warning",
    before: "The CLI refusing to run",
    after: "Before you hit the wall",
  },
  {
    feature: "Multiple providers",
    before: "One login at a time",
    after: "Codex + Antigravity, together",
  },
  {
    feature: "Works minimized",
    before: "No—open the web page",
    after: "Yes—tray companion",
  },
  {
    feature: "Where it lives",
    before: "In a browser tab you forget",
    after: "On your machine, local-first",
  },
]

export function CompareSection() {
  return (
    <section id="compare" className="border-b border-border">
      <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        <h2 className="l-type-2 max-w-xl text-3xl font-semibold sm:text-4xl">
          Plain quota windows vs. Tokenly.
        </h2>
        <div data-reveal className="mt-10 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 pr-4 font-normal text-muted-foreground" />
                <th className="py-3 pr-4 font-medium">How it usually goes</th>
                <th className="py-3 font-medium text-accent">Tokenly</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row) => (
                <tr key={row.feature} className="border-b border-border">
                  <td className="py-3.5 pr-4 font-medium">{row.feature}</td>
                  <td className="py-3.5 pr-4 text-muted-foreground">
                    {row.before}
                  </td>
                  <td className="py-3.5 text-foreground">{row.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}