import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataState, EmptyState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchDrivers, fetchVehicles, qk, upsertDriver } from "@/lib/api";
import { friendlyError } from "@/lib/rules";
import type { Driver, DriverStatus } from "@/lib/domain";

const STATUSES: DriverStatus[] = ["available", "assigned", "unavailable", "leave"];

export function DriversManager() {
  const queryClient = useQueryClient();
  const drivers = useQuery({ queryKey: qk.drivers, queryFn: fetchDrivers });
  const vehicles = useQuery({ queryKey: qk.vehicles, queryFn: fetchVehicles });
  const [editing, setEditing] = useState<Partial<Driver> | null>(null);

  const save = useMutation({
    mutationFn: (d: Partial<Driver> & { full_name: string }) => upsertDriver(d),
    onSuccess: () => {
      toast.success("Driver saved");
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: qk.drivers });
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const list = drivers.data ?? [];
  const vehicleName = (id: string | null) => {
    const v = (vehicles.data ?? []).find((x) => x.id === id);
    return v ? v.plate_number : "—";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setEditing({ full_name: "", status: "available" })}>
          <Plus className="mr-2 size-4" /> Add driver
        </Button>
      </div>

      <DataState
        isLoading={drivers.isLoading}
        error={drivers.error}
        isEmpty={list.length === 0}
        onRetry={() => void drivers.refetch()}
        empty={<EmptyState icon={Users} title="No drivers yet" description="Add drivers so trips can be assigned." />}
      >
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Licence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Default vehicle</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{d.phone ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{d.license_number ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={d.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{vehicleName(d.assigned_vehicle_id)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setEditing(d)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DataState>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit driver" : "Add driver"}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!editing.full_name?.trim()) {
                  toast.error("Driver name is required");
                  return;
                }
                save.mutate({ ...editing, full_name: editing.full_name.trim() });
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dname">Full name</Label>
                  <Input
                    id="dname"
                    value={editing.full_name ?? ""}
                    onChange={(e) => setEditing({ ...editing, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dphone">Phone</Label>
                  <Input
                    id="dphone"
                    value={editing.phone ?? ""}
                    onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dlic">Licence number</Label>
                  <Input
                    id="dlic"
                    value={editing.license_number ?? ""}
                    onChange={(e) => setEditing({ ...editing, license_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editing.status ?? "available"}
                    onValueChange={(value) => setEditing({ ...editing, status: value as DriverStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Default vehicle</Label>
                  <Select
                    value={editing.assigned_vehicle_id ?? "none"}
                    onValueChange={(value) =>
                      setEditing({ ...editing, assigned_vehicle_id: value === "none" ? null : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No default vehicle</SelectItem>
                      {(vehicles.data ?? []).map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.plate_number} · {v.vehicle_type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dnotes">Notes</Label>
                <Textarea
                  id="dnotes"
                  value={editing.notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? "Saving…" : "Save driver"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
