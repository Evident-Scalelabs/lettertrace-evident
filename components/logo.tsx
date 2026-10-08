import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex w-fit shrink-0 flex-col", className)}>
      <span className="font-sans text-2xl font-semibold tracking-tight text-ink">
        Evident<span className="text-indigo-400">.</span>
      </span>
      <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
        AI Presence
      </span>
    </span>
  );
}
