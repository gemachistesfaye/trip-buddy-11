import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Truck, ClipboardCheck, CalendarDays, BarChart3 } from "lucide-react";
import logoUrl from "@/assets/vf-logo.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_HOME } from "@/lib/domain";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Transport Management System | Internal Portal" },
      {
        name: "description",
        content:
          "Internal portal for submitting transport requests, reviewing them and assigning vehicles and drivers.",
      },
      { property: "og:title", content: "Transport Management System | Internal Portal" },
      {
        property: "og:description",
        content: "Digitised transport request, approval, vehicle assignment, scheduling and reporting workflow.",
      },
    ],
  }),
  component: Index,
});

const HIGHLIGHTS = [
  { icon: ClipboardCheck, title: "Request & review", text: "Daily and weekly requests with notice-period rules." },
  { icon: Truck, title: "Vehicle assignment", text: "Conflict-checked vehicle and driver allocation." },
  { icon: CalendarDays, title: "Transport schedule", text: "Daily, weekly and monthly trip visibility." },
  { icon: BarChart3, title: "Reports", text: "Assignment reports and trip frequency analytics." },
];

function Index() {
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session && role) void navigate({ to: ROLE_HOME[role], replace: true });
  }, [loading, session, role, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center overflow-hidden rounded-md bg-primary/10">
              <img src={logoUrl} alt="VisionFund logo" width={512} height={512} className="size-7 object-contain" />
            </span>
            <div>
              <p className="text-sm font-semibold">Transport Management System</p>
              <p className="text-xs text-muted-foreground">Internal Logistics Portal</p>
            </div>
          </div>
          <Button asChild size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Transport requests, approvals and vehicle assignment in one internal system
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Departments submit daily and weekly transport requests. Logistics reviews, approves and assigns a vehicle
          and driver. Everyone tracks the same schedule and reports.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link to="/auth">Sign in to continue</Link>
          </Button>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map((h) => (
            <div key={h.title} className="rounded-lg border bg-card p-4">
              <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <h.icon className="size-4.5" />
              </span>
              <p className="mt-3 font-medium">{h.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{h.text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Internal use only · Demonstration data
      </footer>
    </div>
  );
}
