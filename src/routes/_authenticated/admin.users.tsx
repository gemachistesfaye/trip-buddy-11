import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { DataState, EmptyState } from "@/components/DataState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchProfiles, fetchRoles, qk, setUserRole } from "@/lib/api";
import { friendlyError } from "@/lib/rules";
import { STATUS_LABELS, type AppRole } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "User Management | Administration" },
      { name: "description", content: "Manage system users, their departments and assigned access roles." },
      { property: "og:title", content: "User Management | Administration" },
      { property: "og:description", content: "Manage users, departments and access roles." },
    ],
  }),
  component: AdminUsers,
});

const ROLES: AppRole[] = ["department_user", "logistics_officer", "admin"];

function AdminUsers() {
  const queryClient = useQueryClient();
  const profiles = useQuery({ queryKey: qk.profiles, queryFn: fetchProfiles });
  const roles = useQuery({ queryKey: ["roles"], queryFn: fetchRoles });

  const save = useMutation({
    mutationFn: (input: { userId: string; role: AppRole }) => setUserRole(input.userId, input.role),
    onSuccess: () => {
      toast.success("Role updated");
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const roleFor = (authUserId: string) =>
    (roles.data ?? []).find((r) => r.user_id === authUserId)?.role ?? "department_user";

  const rows = profiles.data ?? [];

  return (
    <AppShell area="admin" title="Users" description="Accounts, departments and roles">
      <DataState
        isLoading={profiles.isLoading}
        error={profiles.error}
        isEmpty={rows.length === 0}
        onRetry={() => void profiles.refetch()}
        empty={<EmptyState title="No users yet" />}
      >
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-56">Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.email || "—"}</TableCell>
                  <TableCell>{p.departments?.name ?? "—"}</TableCell>
                  <TableCell>{p.phone ?? "—"}</TableCell>
                  <TableCell>
                    <Select
                      value={roleFor(p.auth_user_id)}
                      onValueChange={(value) => save.mutate({ userId: p.auth_user_id, role: value as AppRole })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {STATUS_LABELS[r] ?? r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DataState>
    </AppShell>
  );
}
