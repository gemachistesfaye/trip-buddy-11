import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataState, EmptyState } from "@/components/DataState";
import { fetchDepartments, qk, upsertDepartment } from "@/lib/api";
import { friendlyError } from "@/lib/rules";
import type { Department } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/admin/departments")({
  head: () => ({
    meta: [
      { title: "Departments | Administration" },
      { name: "description", content: "Create and maintain departments, their codes and transport focal contacts." },
      { property: "og:title", content: "Departments | Administration" },
      { property: "og:description", content: "Maintain departments, codes and contacts." },
    ],
  }),
  component: AdminDepartments,
});

type Draft = Partial<Department> & { name: string; code: string };
const EMPTY: Draft = { name: "", code: "", contact_name: "", contact_phone: "", is_active: true };

function AdminDepartments() {
  const queryClient = useQueryClient();
  const departments = useQuery({ queryKey: qk.departments, queryFn: fetchDepartments });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const save = useMutation({
    mutationFn: () => upsertDepartment(draft),
    onSuccess: () => {
      toast.success("Department saved");
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: qk.departments });
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const rows = departments.data ?? [];

  return (
    <AppShell
      area="admin"
      title="Departments"
      description="Organisational units that raise transport requests"
      actions={
        <Button
          size="sm"
          onClick={() => {
            setDraft(EMPTY);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 size-4" /> New department
        </Button>
      }
    >
      <DataState
        isLoading={departments.isLoading}
        error={departments.error}
        isEmpty={rows.length === 0}
        onRetry={() => void departments.refetch()}
        empty={<EmptyState title="No departments yet" description="Add the first department." />}
      >
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>{d.code}</TableCell>
                  <TableCell>{d.contact_name ?? "—"}</TableCell>
                  <TableCell>{d.contact_phone ?? "—"}</TableCell>
                  <TableCell>{d.is_active ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDraft(d);
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DataState>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit department" : "New department"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input id="code" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cname">Contact name</Label>
                <Input
                  id="cname"
                  value={draft.contact_name ?? ""}
                  onChange={(e) => setDraft({ ...draft, contact_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cphone">Contact phone</Label>
                <Input
                  id="cphone"
                  value={draft.contact_phone ?? ""}
                  onChange={(e) => setDraft({ ...draft, contact_phone: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="active"
                checked={draft.is_active ?? true}
                onCheckedChange={(checked) => setDraft({ ...draft, is_active: checked })}
              />
              <Label htmlFor="active">Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
