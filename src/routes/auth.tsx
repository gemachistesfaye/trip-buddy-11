import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import logoUrl from "@/assets/vf-logo.png";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_HOME, USER_EMAIL_DOMAIN } from "@/lib/domain";
import { friendlyError } from "@/lib/rules";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in | Transport Management System" },
      { name: "description", content: "Sign in to submit, review or assign internal transport requests." },
      { property: "og:title", content: "Sign in | Transport Management System" },
      { property: "og:description", content: "Secure access to the internal transport management portal." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Enter your username")
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, "Username can only contain letters, numbers, dot, dash or underscore"),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, role, loading } = useAuth();

  useEffect(() => {
    if (!loading && session && role) void navigate({ to: ROLE_HOME[role], replace: true });
  }, [loading, session, role, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex size-9 items-center justify-center overflow-hidden rounded-md bg-primary/10">
            <img src={logoUrl} alt="VisionFund logo" width={512} height={512} className="size-7 object-contain" />
          </span>
          <div>
            <p className="text-sm font-semibold">Transport Management System</p>
            <p className="text-xs text-muted-foreground">Internal Logistics Portal</p>
          </div>
        </Link>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-4 space-y-1">
            <h1 className="text-lg font-semibold">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Accounts are created by the administrator. Use the username and password you were provided.
            </p>
          </div>
          <LoginForm />
        </div>

        <div className="mt-4 rounded-lg border bg-card p-4 text-xs text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">Provided accounts</p>
          <ul className="space-y-1">
            <li>
              <strong>Department users:</strong> dept1 … dept9 (one per department)
            </li>
            <li>
              <strong>Logistics Officer:</strong> logistics
            </li>
            <li>
              <strong>Administrator:</strong> admin
            </li>
            <li>
              <strong>Password for all:</strong> Transport@2026 — change it after your first sign in.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse({ username, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: `${parsed.data.username.toLowerCase()}${USER_EMAIL_DOMAIN}`,
      password: parsed.data.password,
    });
    setBusy(false);
    if (signInError) {
      setError("Incorrect username or password.");
      void friendlyError;
      return;
    }
    toast.success("Signed in successfully.");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="login-username">Username</Label>
        <Input
          id="login-username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="dept1"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Sign in
      </Button>
    </form>
  );
}
