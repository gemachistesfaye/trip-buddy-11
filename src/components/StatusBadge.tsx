import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/domain";

const TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  submitted: "bg-info/10 text-info border-info/30",
  under_review: "bg-warning/15 text-warning-foreground border-warning/40 dark:text-warning",
  approved: "bg-success/12 text-success border-success/30",
  assigned: "bg-primary/10 text-primary border-primary/30",
  in_progress: "bg-primary/15 text-primary border-primary/40",
  completed: "bg-success/15 text-success border-success/40",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  available: "bg-success/12 text-success border-success/30",
  maintenance: "bg-warning/15 text-warning-foreground border-warning/40 dark:text-warning",
  unavailable: "bg-destructive/10 text-destructive border-destructive/30",
  leave: "bg-muted text-muted-foreground border-border",
  daily: "bg-secondary text-secondary-foreground border-border",
  weekly: "bg-accent text-accent-foreground border-border",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE[status] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
