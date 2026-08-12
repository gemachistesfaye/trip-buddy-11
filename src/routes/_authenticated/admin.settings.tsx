import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataState } from "@/components/DataState";
import { fetchSettingRows, saveSetting } from "@/lib/api";
import { friendlyError } from "@/lib/rules";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({
    meta: [
      { title: "System Settings | Administration" },
      { name: "description", content: "Configure notice periods and other transport workflow rules for the organisation." },
      { property: "og:title", content: "System Settings | Administration" },
      { property: "og:description", content: "Configure notice periods and workflow rules." },
    ],
  }),
  component: AdminSettings,
});

function AdminSettings() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["setting-rows"], queryFn: fetchSettingRows });
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings.data) {
      setValues(Object.fromEntries(settings.data.map((s) => [s.key, s.value])));
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async () => {
      for (const [key, value] of Object.entries(values)) await saveSetting(key, value);
    },
    onSuccess: () => {
      toast.success("Settings saved");
      void queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  return (
    <AppShell area="admin" title="System Settings" description="Workflow rules applied across the system">
      <DataState isLoading={settings.isLoading} error={settings.error} onRetry={() => void settings.refetch()}>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
            <CardDescription>Notice periods are enforced when departments submit requests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(settings.data ?? []).map((s) => (
              <div key={s.key} className="space-y-2">
                <Label htmlFor={s.key}>{s.description ?? s.key}</Label>
                <Input
                  id={s.key}
                  value={values[s.key] ?? ""}
                  onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Key: {s.key}</p>
              </div>
            ))}
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save settings"}
            </Button>
          </CardContent>
        </Card>
      </DataState>
    </AppShell>
  );
}
