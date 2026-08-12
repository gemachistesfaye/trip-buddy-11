import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { updateProfile } from "@/lib/api";
import { friendlyError } from "@/lib/rules";
import { STATUS_LABELS } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/department/profile")({
  head: () => ({
    meta: [
      { title: "My Profile | Transport Management" },
      { name: "description", content: "Update your contact details used on transport requests." },
      { property: "og:title", content: "My Profile | Transport Management" },
      { property: "og:description", content: "Update your contact details." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, role, refresh } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile?.full_name, profile?.phone]);

  const save = useMutation({
    mutationFn: () => updateProfile(profile?.id as string, { full_name: fullName.trim(), phone: phone.trim() || null }),
    onSuccess: async () => {
      toast.success("Profile updated");
      await refresh();
      void queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  return (
    <AppShell area="department" title="My Profile" description="Contact details used on your requests">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Personal details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile?.email ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Department</Label>
                <Input value={profile?.department_name ?? "Not assigned"} disabled />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={role ? (STATUS_LABELS[role] ?? role) : "No role"} disabled />
              </div>
            </div>
            <Button type="submit" disabled={save.isPending || !profile}>
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}
