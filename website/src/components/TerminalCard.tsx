import { Separator } from "@/components/ui/separator"

type Bar = {
  name: string
  window: string
  reset: string
  used: string
  pct: number
  tone: "green" | "amber" | "red"
}

const BARS: Bar[] = [
  {
    name: "codex",
    window: "hourly",
    reset: "00:41:12",
    used: "5,880 / 12,500",
    pct: 62,
    tone: "green",
  },
  {
    name: "antigravity",
    window: "monthly",
    reset: "12d 04h",
    used: "2,310,440 / 10,000,000",
    pct: 23,
    tone: "amber",
  },
  {
    name: "codex · primary",
    window: "30 m rolling",
    reset: "00:08:51",
    used: "104 / 160",
    pct: 8,
    tone: "red",
  },
]

const BAR_TONE: Record<
  Bar["tone"],
  { bar: string; text: string; dot: string }
> = {
  green: { bar: "bg-[#34d399]", text: "text-[#34d399]", dot: "bg-[#34d399]" },
  amber: { bar: "bg-[#f59e0b]", text: "text-[#f59e0b]", dot: "bg-[#f59e0b]" },
  red: { bar: "bg-[#ef4444]", text: "text-[#ef4444]", dot: "bg-[#ef4444]" },
}

export function TerminalCard() {
  return (
    <div className="bg-[#131211] text-[#e9e4da]">
      <div className="flex items-center gap-1.5 border-b border-[#26231d] px-5 py-3">
        <span className="size-2 rounded-full bg-[#3a362e]" />
        <span className="size-2 rounded-full bg-[#3a362e]" />
        <span className="size-2 rounded-full bg-[#3a362e]" />
        <span className="ml-2 font-mono text-xs text-[#8b8578]">
          tokenly --status
        </span>
      </div>
      <div className="dot-grid px-5 py-6 sm:px-7">
        <p className="font-mono text-sm text-[#8b8578]">
          <span className="text-[#34d399]">$</span> tokenly --status
        </p>
        <div className="mt-6 space-y-6">
          {BARS.map((b) => {
            const tone = BAR_TONE[b.tone]
            return (
              <div key={b.name}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className={`size-1.5 rounded-full ${tone.dot}`} />
                  <span className="font-mono text-sm font-medium text-[#e9e4da]">
                    {b.name}
                  </span>
                  <span className="font-mono text-xs text-[#8b8578]">
                    {b.window}
                  </span>
                  <span className="ml-auto font-mono text-xs text-[#8b8578]">
                    {b.used}
                  </span>
                  <span className={`font-mono text-xs ${tone.text}`}>
                    reset in {b.reset}
                  </span>
                </div>
                <div className="mt-2 h-1 w-full bg-[#26231d]">
                  <div
                    className={`h-full ${tone.bar}`}
                    style={{ width: `${b.pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <Separator className="my-6 border-[#26231d]" />
        <p className="flex items-center gap-2 font-mono text-xs text-[#8b8578]">
          <span className="inline-block size-1.5 rounded-full bg-[#34d399] animate-pulse" />
          next check in 60s
          <span className="cursor-blink ml-1 inline-block h-4 w-2 bg-[#e9e4da]" />
        </p>
      </div>
    </div>
  )
}