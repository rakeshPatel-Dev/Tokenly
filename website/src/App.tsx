import { Analytics } from "@vercel/analytics/react"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { Hero } from "@/components/sections/Hero"
import { WatchSection } from "@/components/sections/WatchSection"
import { ProblemSection } from "@/components/sections/ProblemSection"
import { ResetSection } from "@/components/sections/ResetSection"
import { CompareSection } from "@/components/sections/CompareSection"
import { StackSection } from "@/components/sections/StackSection"
import { DownloadSection } from "@/components/sections/DownloadSection"
import { useReveal } from "@/lib/hooks"

export default function App() {
  useReveal()

  return (
    <div id="top" className="min-h-svh bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <WatchSection />
        <ProblemSection />
        <ResetSection />
        <CompareSection />
        <StackSection />
        <DownloadSection />
      </main>
      <Footer />
      <Analytics />
    </div>
  )
}