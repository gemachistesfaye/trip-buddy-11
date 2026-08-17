import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format, nextMonday, startOfWeek } from "date-fns";
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

/** The paper weekly form runs Monday to Saturday. */
function weekDays(startISO: string): WeeklyDayInput[] {
  const start = new Date(`${startISO}T00:00:00`);
  return Array.from({ length: 6 }).map((_, i) => ({
    trip_date: format(addDays(start, i), "yyyy-MM-dd"),
    morning_requested: false,
    afternoon_requested: false,
    morning_departure_time: "08:00",
    morning_return_time: "12:00",
    morning_passengers: 1,
    afternoon_departure_time: "13:00",
    afternoon_return_time: "17:00",
    afternoon_passengers: 1,
    destination: "",
    purpose: "",
    goods_carried: "",
  }));
}

function defaultWeekStart() {
  const upcoming = nextMonday(addDays(new Date(), 2));
  return format(startOfWeek(upcoming, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

function NewRequest() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: qk.settings, queryFn: fetchSettings });
  const rules = settings ?? DEFAULT_SETTINGS;

  const [tab, setTab] = useState("daily");
  const [contact, setContact] = useState(profile?.phone ?? "");
  const [signature, setSignature] = useState(profile?.full_name ?? "");
  const [shortNoticeReason, setShortNoticeReason] = useState("");

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
  const [fromDate, setFromDate] = useState(defaultWeekStart);
  const [days, setDays] = useState<WeeklyDayInput[]>(() => weekDays(defaultWeekStart()));
  const [weeklyGoods, setWeeklyGoods] = useState("");

  const dailyNotice = useMemo(() => checkDailyNotice(tripDate, departure, rules), [tripDate, departure, rules]);
  const weeklyNotice = useMemo(() => checkWeeklyNotice(fromDate, rules), [fromDate, rules]);
  const activeNotice = tab === "daily" ? dailyNotice : weeklyNotice;

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
        requester_signature: signature,
        short_notice_reason: dailyNotice.ok ? "" : shortNoticeReason,
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
          goods_carried: weeklyGoods,
          requester_signature: signature,
          short_notice_reason: weeklyNotice.ok ? "" : shortNoticeReason,
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
    if (!start) return;
    const monday = format(startOfWeek(new Date(`${start}T00:00:00`), { weekStartsOn: 1 }), "yyyy-MM-dd");
    setFromDate(monday);
    setDays((prev) =>
      weekDays(monday).map((fresh, i) => ({
        ...fresh,
        morning_requested: prev[i]?.morning_requested ?? false,
        afternoon_requested: prev[i]?.afternoon_requested ?? false,
        morning_departure_time: prev[i]?.morning_departure_time ?? fresh.morning_departure_time,
        morning_return_time: prev[i]?.morning_return_time ?? fresh.morning_return_time,
        morning_passengers: prev[i]?.morning_passengers ?? fresh.morning_passengers,
        afternoon_departure_time: prev[i]?.afternoon_departure_time ?? fresh.afternoon_departure_time,
        afternoon_return_time: prev[i]?.afternoon_return_time ?? fresh.afternoon_return_time,
        afternoon_passengers: prev[i]?.afternoon_passengers ?? fresh.afternoon_passengers,
        destination: prev[i]?.destination ?? "",
        purpose: prev[i]?.purpose ?? "",
        goods_carried: prev[i]?.goods_carried ?? "",
      })),
    );
  }

  const noProfile = !profile?.department_id || !profile?.id;
  const needsJustification = !activeNotice.ok && !shortNoticeReason.trim();

  const shortNoticeBlock = !activeNotice.ok ? (
    <Alert>
      <AlertTriangle className="size-4" />
      <AlertTitle>Short notice — justification required</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{activeNotice.message}</p>
        <Textarea
          value={shortNoticeReason}
          onChange={(e) => setShortNoticeReason(e.target.value)}
          placeholder="Explain why this trip cannot meet the standard notice period. Logistics is notified and this reason is stored on the request."
        />
      </AlertDescription>
    </Alert>
  ) : null;

  const signatureBlock = (
    <div className="space-y-2">
      <Label htmlFor="sig">Requester signature (type your full name)</Label>
      <Input id="sig" value={signature} onChange={(e) => setSignature(e.target.value)} required />
      <p className="text-xs text-muted-foreground">
        Typing your name signs this request and is recorded with a timestamp as approval evidence.
      </p>
    </div>
  );

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

      <Tabs value={tab} onValueChange={setTab} className="max-w-5xl">
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
                  if (needsJustification) {
                    toast.error("Add a short-notice justification before submitting.");
                    return;
                  }
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

                {signatureBlock}
                {shortNoticeBlock}

                <Button type="submit" disabled={submitDaily.isPending || noProfile}>
                  {submitDaily.isPending ? "Submitting…" : "Sign & submit request"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly transport request (Monday – Saturday)</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const selected = days.filter((d) => d.morning_requested || d.afternoon_requested);
                  if (selected.length === 0) {
                    toast.error("Select at least one session (morning or afternoon).");
                    return;
                  }
                  if (selected.some((d) => !d.destination.trim() || !d.purpose.trim())) {
                    toast.error("Each selected day needs a destination and purpose.");
                    return;
                  }
                  if (needsJustification) {
                    toast.error("Add a short-notice justification before submitting.");
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
                    <Label htmlFor="wstart">Week starting (Monday)</Label>
                    <Input id="wstart" type="date" value={fromDate} onChange={(e) => shiftWeek(e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-3">
                  {days.map((d, i) => (
                    <div key={d.trip_date} className="rounded-lg border bg-card p-3">
                      <div className="flex flex-wrap items-center gap-4">
                        <p className="min-w-32 text-sm font-medium">
                          {format(new Date(`${d.trip_date}T00:00:00`), "EEEE dd MMM")}
                        </p>
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

                      {d.morning_requested ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="space-y-1">
                            <Label className="text-xs uppercase text-muted-foreground">Morning departure</Label>
                            <Input
                              type="time"
                              value={d.morning_departure_time}
                              onChange={(e) => updateDay(i, { morning_departure_time: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs uppercase text-muted-foreground">Morning return</Label>
                            <Input
                              type="time"
                              value={d.morning_return_time}
                              onChange={(e) => updateDay(i, { morning_return_time: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs uppercase text-muted-foreground">Morning passengers</Label>
                            <Input
                              type="number"
                              min={1}
                              max={rules.maxPassengerCapacity}
                              value={d.morning_passengers}
                              onChange={(e) => updateDay(i, { morning_passengers: Number(e.target.value) })}
                            />
                          </div>
                        </div>
                      ) : null}

                      {d.afternoon_requested ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="space-y-1">
                            <Label className="text-xs uppercase text-muted-foreground">Afternoon departure</Label>
                            <Input
                              type="time"
                              value={d.afternoon_departure_time}
                              onChange={(e) => updateDay(i, { afternoon_departure_time: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs uppercase text-muted-foreground">Afternoon return</Label>
                            <Input
                              type="time"
                              value={d.afternoon_return_time}
                              onChange={(e) => updateDay(i, { afternoon_return_time: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs uppercase text-muted-foreground">Afternoon passengers</Label>
                            <Input
                              type="number"
                              min={1}
                              max={rules.maxPassengerCapacity}
                              value={d.afternoon_passengers}
                              onChange={(e) => updateDay(i, { afternoon_passengers: Number(e.target.value) })}
                            />
                          </div>
                        </div>
                      ) : null}

                      {d.morning_requested || d.afternoon_requested ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
                            placeholder="Goods carried (optional)"
                            value={d.goods_carried ?? ""}
                            onChange={(e) => updateDay(i, { goods_carried: e.target.value })}
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="wgoods">Goods carried for the week (optional)</Label>
                    <Input id="wgoods" value={weeklyGoods} onChange={(e) => setWeeklyGoods(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wremarks">Remarks (optional)</Label>
                    <Input id="wremarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                  </div>
                </div>

                {signatureBlock}
                {shortNoticeBlock}

                <Button type="submit" disabled={submitWeekly.isPending || noProfile}>
                  {submitWeekly.isPending ? "Submitting…" : "Sign & submit weekly request"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
