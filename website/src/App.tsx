import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function App() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-6 text-foreground">
      <img src="/tokenly.svg" alt="Tokenly" className="size-16 rounded-2xl" />
      <div className="max-w-md text-center">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Tokenly
        </h1>
        <p className="mt-2 text-muted-foreground">
          Local-first AI quota tracker. Download page scaffolding is ready.
        </p>
      </div>
      <Button size="lg">
        <Download data-icon="inline-start" />
        Download
      </Button>
    </div>
  )
}
