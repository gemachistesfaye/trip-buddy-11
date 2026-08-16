import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Truck } from "lucide-react";
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
import { fetchDrivers, fetchVehicles, qk, upsertVehicle } from "@/lib/api";
import { friendlyError } from "@/lib/rules";
import type { Vehicle, VehicleStatus } from "@/lib/domain";

const STATUSES: VehicleStatus[] = ["available", "assigned", "maintenance", "unavailable"];
function serviceHint(v: Vehicle): string {
  const interval = v.service_interval_km ?? 0;
  const since = (v.current_odometer ?? 0) - (v.last_service_odometer ?? 0);
  const dueDate = v.next_service_due_date ? new Date(v.next_service_due_date) : null;
  if (dueDate && dueDate <= new Date()) return "Service overdue (date)";
  if (interval > 0 && since >= interval) return "Service due now";
  if (interval > 0) return `${Math.max(interval - since, 0).toLocaleString()} km to service`;
  return dueDate ? `Due ${dueDate.toLocaleDateString()}` : "—";
}

const TYPES = ["Sedan", "SUV", "Pickup", "Minibus", "Bus", "Truck"];

export function VehiclesManager() {
  const queryClient = useQueryClient();
  const vehicles = useQuery({ queryKey: qk.vehicles, queryFn: fetchVehicles });
  const drivers = useQuery({ queryKey: qk.drivers, queryFn: fetchDrivers });
  const [editing, setEditing] = useState<Partial<Vehicle> | null>(null);

  const save = useMutation({
    mutationFn: (v: Partial<Vehicle> & { plate_number: string }) => upsertVehicle(v),
    onSuccess: () => {
      toast.success("Vehicle saved");
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: qk.vehicles });
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const list = vehicles.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setEditing({ plate_number: "", vehicle_type: "Sedan", passenger_capacity: 4 })}>
          <Plus className="mr-2 size-4" /> Add vehicle
        </Button>
      </div>

      <DataState
        isLoading={vehicles.isLoading}
        error={vehicles.error}
        isEmpty={list.length === 0}
        onRetry={() => void vehicles.refetch()}
        empty={<EmptyState icon={Truck} title="No vehicles yet" description="Add the fleet to start assigning trips." />}
      >
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plate</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Default driver</TableHead>
                <TableHead className="text-right">Odometer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.plate_number}</TableCell>
                  <TableCell>{v.vehicle_type}</TableCell>
                  <TableCell className="text-muted-foreground">{v.model ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{v.passenger_capacity}</TableCell>
                  <TableCell>
                    <StatusBadge status={v.current_status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{v.drivers?.full_name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{(v.current_odometer ?? 0).toLocaleString()} km</TableCell>
                  <TableCell className="text-muted-foreground">{serviceHint(v)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setEditing(v)}>
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
            <DialogTitle>{editing?.id ? "Edit vehicle" : "Add vehicle"}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!editing.plate_number?.trim()) {
                  toast.error("Plate number is required");
                  return;
                }
                save.mutate({ ...editing, plate_number: editing.plate_number.trim() });
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="plate">Plate number</Label>
                  <Input
                    id="plate"
                    value={editing.plate_number ?? ""}
                    onChange={(e) => setEditing({ ...editing, plate_number: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vehicle type</Label>
                  <Select
                    value={editing.vehicle_type ?? "Sedan"}
                    onValueChange={(value) => setEditing({ ...editing, vehicle_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={editing.model ?? ""}
                    onChange={(e) => setEditing({ ...editing, model: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cap">Passenger capacity</Label>
                  <Input
                    id="cap"
                    type="number"
                    min={1}
                    value={editing.passenger_capacity ?? 4}
                    onChange={(e) => setEditing({ ...editing, passenger_capacity: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editing.current_status ?? "available"}
                    onValueChange={(value) => setEditing({ ...editing, current_status: value as VehicleStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default driver</Label>
                  <Select
                    value={editing.assigned_driver_id ?? "none"}
                    onValueChange={(value) =>
                      setEditing({ ...editing, assigned_driver_id: value === "none" ? null : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No default driver</SelectItem>
                      {(drivers.data ?? []).map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="odo">Current odometer (km)</Label>
                  <Input
                    id="odo"
                    type="number"
                    min={0}
                    value={editing.current_odometer ?? 0}
                    onChange={(e) => setEditing({ ...editing, current_odometer: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval">Service interval (km)</Label>
                  <Input
                    id="interval"
                    type="number"
                    min={0}
                    value={editing.service_interval_km ?? 5000}
                    onChange={(e) => setEditing({ ...editing, service_interval_km: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastodo">Odometer at last service (km)</Label>
                  <Input
                    id="lastodo"
                    type="number"
                    min={0}
                    value={editing.last_service_odometer ?? 0}
                    onChange={(e) => setEditing({ ...editing, last_service_odometer: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nextservice">Next service due date</Label>
                  <Input
                    id="nextservice"
                    type="date"
                    value={editing.next_service_due_date ?? ""}
                    onChange={(e) => setEditing({ ...editing, next_service_due_date: e.target.value || null })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={editing.notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? "Saving…" : "Save vehicle"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
