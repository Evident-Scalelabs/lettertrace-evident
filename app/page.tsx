import Link from "next/link";
import { ArrowRight, ChartNoAxesCombined, FileText, MessagesSquare, Users } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { Button, Card } from "@/components/ui";

const sections = [
  {
    title: "Overview",
    description: "Review brand mentions, sentiment, and share of voice from your monitoring runs.",
    href: "/dashboard",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Topics",
    description: "Manage the questions you want to track and the prompts used to measure them.",
    href: "/dashboard/topics",
    icon: MessagesSquare,
  },
  {
    title: "Competitors",
    description: "Compare which brands appear alongside yours in the answers you collect.",
    href: "/dashboard/competitors",
    icon: Users,
  },
  {
    title: "Reports",
    description: "Open completed runs and inspect the answers behind your results.",
    href: "/dashboard/runs",
    icon: FileText,
  },
];

export default function WorkspaceEntry() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="border-b border-ink/10 bg-paper-shade/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <Logo />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button href="/login" variant="secondary" size="sm">Sign in</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12 sm:py-20">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-faint">Client workspace</p>
          <h1 className="mt-4 font-sans text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Your brand in AI answers.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
            Track how your brand is mentioned, compare competitors, and review the evidence
            behind each result in your Evident AI Presence workspace.
          </p>
          <Button href="/dashboard" className="mt-7">
            Open dashboard <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
          <p className="mt-3 text-xs text-ink-faint">Sign in to access your organization and monitoring results.</p>
        </div>

        <section aria-labelledby="workspace-sections" className="mt-14 sm:mt-20">
          <div className="mb-5 flex items-center gap-4">
            <h2 id="workspace-sections" className="font-sans text-sm font-medium text-ink-soft">In your workspace</h2>
            <div className="h-px flex-1 bg-ink/10" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sections.map(({ title, description, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                <Card className="h-full rounded-xl p-6 transition-colors group-hover:border-indigo-400/40">
                  <Icon className="h-5 w-5 text-indigo-400" aria-hidden />
                  <h3 className="mt-5 flex items-center justify-between gap-2 font-sans text-base font-semibold">
                    {title}<ArrowRight className="h-4 w-4 text-ink-faint" aria-hidden />
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-faint">{description}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-ink/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5 text-xs text-ink-faint">
          <span>Evident · AI Presence</span>
          <a
            href="https://github.com/letterstory/lettertrace"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
          >
            Built on Lettertrace · MIT license
          </a>
        </div>
      </footer>
    </div>
  );
}
