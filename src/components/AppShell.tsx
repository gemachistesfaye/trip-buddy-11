import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FilePlus2,
  ClipboardList,
  Bell,
  User,
  CalendarDays,
  Truck,
  Users,
  ClipboardCheck,
  BarChart3,
  Building2,
  Settings,
  Menu,
  LogOut,
  Moon,
  Sun,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_HOME, STATUS_LABELS, type AppRole } from "@/lib/domain";
import { fetchNotifications, fetchSettings, qk } from "@/lib/api";

export type Area = "department" | "logistics" | "admin";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const NAV: Record<Area, NavItem[]> = {
  department: [
    { to: "/department/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/department/new-request", label: "New Request", icon: FilePlus2 },
    { to: "/department/requests", label: "My Requests", icon: ClipboardList },
    { to: "/department/notifications", label: "Notifications", icon: Bell },
    { to: "/department/profile", label: "Profile", icon: User },
  ],
  logistics: [
    { to: "/logistics/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/logistics/requests", label: "Transport Requests", icon: ClipboardList },
    { to: "/logistics/schedule", label: "Schedule", icon: CalendarDays },
    { to: "/logistics/vehicles", label: "Vehicles", icon: Truck },
    { to: "/logistics/drivers", label: "Drivers", icon: Users },
    { to: "/logistics/assignments", label: "Assignments", icon: ClipboardCheck },
    { to: "/logistics/reports", label: "Reports", icon: BarChart3 },
    { to: "/logistics/notifications", label: "Notifications", icon: Bell },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/departments", label: "Departments", icon: Building2 },
    { to: "/admin/vehicles", label: "Vehicles", icon: Truck },
    { to: "/admin/drivers", label: "Drivers", icon: User },
    { to: "/admin/settings", label: "System Settings", icon: Settings },
  ],
};

const AREA_ROLES: Record<Area, AppRole[]> = {
  department: ["department_user"],
  logistics: ["logistics_officer", "admin"],
  admin: ["admin"],
};

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = window.localStorage.getItem("vf-theme");
    const isDark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  const toggle = () => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      window.localStorage.setItem("vf-theme", next ? "dark" : "light");
      return next;
    });
  };
  return { dark, toggle };
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ org }: { org: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-sidebar-border px-4 py-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <Truck className="size-4.5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-sidebar-foreground">{org}</p>
        <p className="truncate text-xs text-sidebar-foreground/60">Transport Management</p>
      </div>
    </div>
  );
}

export function AppShell({
  area,
  title,
  description,
  actions,
  children,
}: {
  area: Area;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { profile, role, loading, signOut, userId } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { dark, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: settings } = useQuery({ queryKey: qk.settings, queryFn: fetchSettings });
  const { data: notifications } = useQuery({
    queryKey: qk.notifications(userId ?? "anon"),
    queryFn: () => fetchNotifications(userId as string),
    enabled: !!userId,
    refetchInterval: 60_000,
  });
  const unread = (notifications ?? []).filter((n) => !n.is_read).length;

  useEffect(() => {
    if (loading) return;
    if (!role) return;
    if (!AREA_ROLES[area].includes(role)) {
      void navigate({ to: ROLE_HOME[role], replace: true });
    }
  }, [loading, role, area, navigate]);

  const items = NAV[area];
  const org = settings?.organizationName ?? "VisionFund";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm space-y-3 p-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (role && !AREA_ROLES[area].includes(role)) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <ShieldCheck className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-3 text-lg font-semibold">Access restricted</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You don't have permission to view this area. Redirecting you to your workspace…
          </p>
        </div>
      </div>
    );
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar lg:flex">
        <Brand org={org} />
        <NavLinks items={items} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card/95 px-3 backdrop-blur sm:px-5">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 border-sidebar-border bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Brand org={org} />
              <NavLinks items={items} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold sm:text-base">{title}</p>
            {description ? (
              <p className="hidden truncate text-xs text-muted-foreground sm:block">{description}</p>
            ) : null}
          </div>

          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle dark mode">
            {dark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
          </Button>

          <Link
            to={area === "admin" ? "/admin/dashboard" : `/${area}/notifications`}
            className="relative inline-flex size-9 items-center justify-center rounded-md text-foreground hover:bg-accent"
            aria-label="Notifications"
          >
            <Bell className="size-4.5" />
            {unread > 0 ? (
              <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {(profile?.full_name || profile?.email || "?").slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden max-w-32 truncate text-sm sm:inline">
                  {profile?.full_name || profile?.email}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="space-y-0.5">
                <p className="truncate text-sm">{profile?.full_name || "Unnamed user"}</p>
                <p className="truncate text-xs font-normal text-muted-foreground">
                  {role ? STATUS_LABELS[role] : "No role"}
                  {profile?.department_name ? ` · ${profile.department_name}` : ""}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {role === "department_user" ? (
                <DropdownMenuItem asChild>
                  <Link to="/department/profile">
                    <User className="mr-2 size-4" /> Profile
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 size-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="min-w-0 flex-1 p-3 sm:p-5">
          {actions ? <div className="mb-4 flex flex-wrap items-center gap-2">{actions}</div> : null}
          {children}
        </main>
      </div>
    </div>
  );
}
