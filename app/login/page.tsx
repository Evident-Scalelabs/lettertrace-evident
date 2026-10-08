import { MessagesSquare, Users, TrendingUp } from "lucide-react";
import { Card, CardBody } from "@/components/ui";
import { Logo } from "@/components/logo";
import { AuthForm } from "./auth-form";

export const dynamic = "force-dynamic";

const bullets = [
  {
    icon: MessagesSquare,
    title: "Follow your topics",
    body: "Track the questions people ask and review how your brand appears in the answers.",
  },
  {
    icon: Users,
    title: "Track competitors",
    body: "See who else gets named alongside your brand, and how often.",
  },
  {
    icon: TrendingUp,
    title: "Watch the trends",
    body: "Follow mention rate and share-of-voice over time as models change.",
  },
];

export default async function LoginPage(
  props: {
    searchParams: Promise<{ next?: string; mode?: string; error?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const next = typeof searchParams.next === "string" ? searchParams.next : undefined;
  const mode = typeof searchParams.mode === "string" ? searchParams.mode : undefined;
  // Set by /auth/callback when a provider hand-off or code exchange fails.
  const error = typeof searchParams.error === "string" ? searchParams.error : undefined;

  return (
    <main className="flex min-h-screen bg-paper">
      {/* Left: branded panel */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-paper-shade px-12 py-14 lg:flex">
        <div className="relative">
          <Logo />
        </div>

        <div className="relative max-w-md">
          <h1 className="font-sans text-4xl font-semibold leading-tight text-ink">
            Monitor your brand across AI answers.
          </h1>
          <p className="mt-4 text-base text-ink-soft">
            Your Evident workspace brings together how you and your competitors appear when people ask
            AI assistants for recommendations.
          </p>

          <ul className="mt-10 space-y-5">
            {bullets.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded bg-indigo-400/10 text-indigo-400">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="font-medium text-ink">{title}</p>
                  <p className="mt-0.5 text-sm text-ink-faint">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-ink-faint">
          Evident · AI Presence · Built on Lettertrace
        </p>
      </aside>

      {/* Right: auth form */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </div>
          <Card>
            <CardBody className="p-8 sm:p-10">
              <AuthForm next={next} mode={mode} initialError={error} />
            </CardBody>
          </Card>
        </div>
      </div>
    </main>
  );
}
