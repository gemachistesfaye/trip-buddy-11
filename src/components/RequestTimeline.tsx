import { REQUEST_TIMELINE, type RequestStatus } from "@/lib/domain";
import { Check, Circle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function RequestTimeline({ status }: { status: RequestStatus }) {
  if (status === "rejected" || status === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
        <span className="flex size-7 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <X className="size-4" />
        </span>
        <p className="text-sm font-medium text-destructive">
          {status === "rejected" ? "Request rejected" : "Request cancelled"}
        </p>
      </div>
    );
  }

  const order: RequestStatus[] = ["submitted", "under_review", "approved", "assigned", "completed"];
  const effective: RequestStatus = status === "in_progress" ? "assigned" : status;
  const currentIndex = Math.max(order.indexOf(effective), 0);

  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:items-start sm:gap-0">
      {REQUEST_TIMELINE.map((step, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        return (
          <li key={step.status} className="flex flex-1 gap-3 sm:flex-col sm:items-center sm:text-center">
            <div className="flex flex-col items-center sm:w-full sm:flex-row">
              <span className="hidden h-0.5 flex-1 bg-border sm:block" style={{ opacity: i === 0 ? 0 : 1 }} />
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                  done && "border-success bg-success text-success-foreground",
                  current && "border-primary bg-primary text-primary-foreground",
                  !done && !current && "border-border bg-card text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : <Circle className="size-2 fill-current" />}
              </span>
              <span className="hidden h-0.5 flex-1 bg-border sm:block" style={{ opacity: i === REQUEST_TIMELINE.length - 1 ? 0 : 1 }} />
              <span className="my-1 h-6 w-0.5 bg-border sm:hidden" style={{ opacity: i === REQUEST_TIMELINE.length - 1 ? 0 : 1 }} />
            </div>
            <p
              className={cn(
                "pb-4 text-sm sm:pb-0 sm:pt-2",
                current ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
