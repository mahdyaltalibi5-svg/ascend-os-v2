import { cn } from "@/lib/utils";

type AscendMarkProps = {
  className?: string;
  showWordmark?: boolean;
};

export function AscendMark({ className, showWordmark = false }: AscendMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)} aria-label="Ascend OS">
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border-strong bg-surface-elevated shadow-[inset_0_1px_0_hsl(var(--foreground)/0.08),0_16px_34px_hsl(var(--primary)/0.16)]">
        <svg aria-hidden="true" className="h-7 w-7 text-primary" fill="none" viewBox="0 0 32 32">
          <path
            d="M6.5 24.5 16 6l9.5 18.5h-5.2L16 15.9l-4.3 8.6H6.5Z"
            fill="currentColor"
            opacity="0.96"
          />
          <path d="M13.2 22.8h5.6" stroke="white" strokeLinecap="round" strokeWidth="2.2" />
          <path
            d="M20.3 7.9h5.2v5.2"
            stroke="hsl(var(--primary-soft))"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.1"
          />
        </svg>
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-background bg-success shadow-[0_0_18px_hsl(var(--success)/0.7)]" />
      </div>
      {showWordmark ? (
        <div className="leading-none">
          <p className="text-sm font-semibold tracking-normal text-foreground">Ascend OS</p>
          <p className="mt-1 text-[11px] font-semibold uppercase text-muted-soft">
            Command foundation
          </p>
        </div>
      ) : null}
    </div>
  );
}
