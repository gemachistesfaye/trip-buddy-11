import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { createDailyRequest, createWeeklyRequest, fetchSettings, qk, type WeeklyDayInput } from "@/lib/api";
import { checkDailyNotice, checkWeeklyNotice, DEFAULT_SETTINGS, friendlyError } from "@/lib/rules";

export const Route = createFileRoute("/_authenticated/department/new-request")({
  head: () => ({
    meta: [
      { title: "New Transport Request | Transport Management" },
      { name: "description", content: "Submit a daily or weekly transport request with destination, timing and passengers." },
      { property: "og:title", content: "New Transport Request" },
      { property: "og:description", content: "Submit a daily or weekly transport request." },
    ],
  }),
  component: NewRequest,
});

const today = () => format(new Date(), "yyyy-MM-dd");

function NewRequest() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: qk.settings, queryFn: fetchSettings });
  const rules = settings ?? DEFAULT_SETTINGS;

  const [tab, setTab] = useState("daily");
  const [contact, setContact] = useState(profile?.phone ?? "");

  /* daily state */
  const [tripDate, setTripDate] = useState(format(addDays(new Date(), 2), "yyyy-MM-dd"));
  const [departure, setDeparture] = useState("08:00");
  const [ret, setRet] = useState("17:00");
  const [destination, setDestination] = useState("");
  const [pax, setPax] = useState(1);
  const [purpose, setPurpose] = useState("");
  const [goods, setGoods] = useState("");
  const [remarks, setRemarks] = useState("");

  /* weekly state */
  const [fromDate, setFromDate] = useState(format(addDays(new Date(), 5), "yyyy-MM-dd"));
  const [days, setDays] = useState<WeeklyDayInput[]>(() =>
    Array.from({ length: 5 }).map((_, i) => ({
      trip_date: format(addDays(new Date(), 5 + i), "yyyy-MM-dd"),
      morning_requested: i === 0,
      afternoon_requested: false,
      departure_time: "08:00",
      return_time: "17:00",
      destination: "",
      number_of_passengers: 1,
      purpose: "",
    })),
  );

  const dailyNotice = useMemo(() => checkDailyNotice(tripDate, departure, rules), [tripDate, departure, rules]);
  const weeklyNotice = useMemo(() => checkWeeklyNotice(fromDate, rules), [fromDate, rules]);

  const submitDaily = useMutation({
    mutationFn: () =>
      createDailyRequest({
        requesting_department_id: profile?.department_id as string,
        requester_id: profile?.id as string,
        contact_number: contact,
        request_date: today(),
        trip_date: tripDate,
        number_of_passengers: pax,
        destination,
        preferred_departure_time: departure,
        estimated_return_time: ret,
        purpose,
        goods_carried: goods,
        remarks,
      }),
    onSuccess: () => {
      toast.success("Transport request submitted");
      void queryClient.invalidateQueries();
      void navigate({ to: "/department/requests" });
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const submitWeekly = useMutation({
    mutationFn: () => {
      const selected = days.filter((d) => d.morning_requested || d.afternoon_requested);
      const sorted = [...selected].sort((a, b) => a.trip_date.localeCompare(b.trip_date));
      return createWeeklyRequest(
        {
          requesting_department_id: profile?.department_id as string,
          requester_id: profile?.id as string,
          contact_number: contact,
          request_date: today(),
          trip_from_date: sorted[0]?.trip_date ?? fromDate,
          trip_to_date: sorted[sorted.length - 1]?.trip_date ?? fromDate,
          remarks,
        },
        sorted,
      );
    },
    onSuccess: () => {
      toast.success("Weekly transport request submitted");
      void queryClient.invalidateQueries();
      void navigate({ to: "/department/requests" });
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  function updateDay(index: number, patch: Partial<WeeklyDayInput>) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function shiftWeek(start: string) {
    setFromDate(start);
    setDays((prev) =>
      prev.map((d, i) => ({ ...d, trip_date: format(addDays(new Date(`${start}T00:00:00`), i), "yyyy-MM-dd") })),
    );
  }

  const noProfile = !profile?.department_id || !profile?.id;

  return (
    <AppShell area="department" title="New Transport Request" description="Daily trip or a recurring weekly plan">
      {noProfile ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="size-4" />
          <AlertTitle>Department missing</AlertTitle>
          <AlertDescription>
            Your account isn't linked to a department yet. Ask an administrator to assign one before submitting requests.
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={tab} onValueChange={setTab} className="max-w-4xl">
        <TabsList>
          <TabsTrigger value="daily">Daily request</TabsTrigger>
          <TabsTrigger value="weekly">Weekly request</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily transport request</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitDaily.mutate();
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dept">Requesting department</Label>
                    <Input id="dept" value={profile?.department_name ?? "—"} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact">Contact number</Label>
                    <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tdate">Trip date</Label>
                    <Input id="tdate" type="date" value={tripDate} onChange={(e) => setTripDate(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pax">Number of passengers</Label>
                    <Input
                      id="pax"
                      type="number"
                      min={1}
                      max={rules.maxPassengerCapacity}
                      value={pax}
                      onChange={(e) => setPax(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dep">Preferred departure time</Label>
                    <Input id="dep" type="time" value={departure} onChange={(e) => setDeparture(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ret">Estimated return time</Label>
                    <Input id="ret" type="time" value={ret} onChange={(e) => setRet(e.target.value)} required />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="dest">Destination</Label>
                    <Input id="dest" value={destination} onChange={(e) => setDestination(e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose of trip</Label>
                  <Textarea id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="goods">Goods carried (optional)</Label>
                    <Input id="goods" value={goods} onChange={(e) => setGoods(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="remarks">Remarks (optional)</Label>
                    <Input id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                  </div>
                </div>

                {!dailyNotice.ok ? (
                  <Alert>
                    <AlertTriangle className="size-4" />
                    <AlertTitle>Short notice</AlertTitle>
                    <AlertDescription>{dailyNotice.message}</AlertDescription>
                  </Alert>
                ) : null}

                <Button type="submit" disabled={submitDaily.isPending || noProfile}>
                  {submitDaily.isPending ? "Submitting…" : "Submit request"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly transport request</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const selected = days.filter((d) => d.morning_requested || d.afternoon_requested);
                  if (selected.length === 0) {
                    toast.error("Select at least one day (morning or afternoon).");
                    return;
                  }
                  if (selected.some((d) => !d.destination.trim() || !d.purpose.trim())) {
                    toast.error("Each selected day needs a destination and purpose.");
                    return;
                  }
                  submitWeekly.mutate();
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="wcontact">Contact number</Label>
                    <Input id="wcontact" value={contact} onChange={(e) => setContact(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wstart">Week starting</Label>
                    <Input id="wstart" type="date" value={fromDate} onChange={(e) => shiftWeek(e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-3">
                  {days.map((d, i) => {
                    const active = d.morning_requested || d.afternoon_requested;
                    return (
                      <div key={d.trip_date + i} className="rounded-lg border bg-card p-3">
                        <div className="flex flex-wrap items-center gap-4">
                          <p className="min-w-32 text-sm font-medium">{format(new Date(`${d.trip_date}T00:00:00`), "EEE dd MMM")}</p>
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={d.morning_requested}
                              onCheckedChange={(v) => updateDay(i, { morning_requested: v === true })}
                            />
                            Morning
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={d.afternoon_requested}
                              onCheckedChange={(v) => updateDay(i, { afternoon_requested: v === true })}
                            />
                            Afternoon
                          </label>
                        </div>
                        {active ? (
                          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <Input
                              placeholder="Destination"
                              value={d.destination}
                              onChange={(e) => updateDay(i, { destination: e.target.value })}
                            />
                            <Input
                              placeholder="Purpose"
                              value={d.purpose}
                              onChange={(e) => updateDay(i, { purpose: e.target.value })}
                            />
                            <Input
                              type="number"
                              min={1}
                              max={rules.maxPassengerCapacity}
                              value={d.number_of_passengers}
                              onChange={(e) => updateDay(i, { number_of_passengers: Number(e.target.value) })}
                            />
                            <div className="flex gap-2">
                              <Input
                                type="time"
                                value={d.departure_time}
                                onChange={(e) => updateDay(i, { departure_time: e.target.value })}
                              />
                              <Input
                                type="time"
                                value={d.return_time}
                                onChange={(e) => updateDay(i, { return_time: e.target.value })}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wremarks">Remarks (optional)</Label>
                  <Textarea id="wremarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                </div>

                {!weeklyNotice.ok ? (
                  <Alert>
                    <AlertTriangle className="size-4" />
                    <AlertTitle>Short notice</AlertTitle>
                    <AlertDescription>{weeklyNotice.message}</AlertDescription>
                  </Alert>
                ) : null}

                <Button type="submit" disabled={submitWeekly.isPending || noProfile}>
                  {submitWeekly.isPending ? "Submitting…" : "Submit weekly request"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
