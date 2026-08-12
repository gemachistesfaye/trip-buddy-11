import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataState, EmptyState } from "@/components/DataState";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead, qk } from "@/lib/api";
import { friendlyError } from "@/lib/rules";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export function NotificationsPanel() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const key = qk.notifications(userId ?? "anon");

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchNotifications(userId as string),
    enabled: !!userId,
  });

  const readOne = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    onError: (e) => toast.error(friendlyError(e)),
  });

  const readAll = useMutation({
    mutationFn: () => markAllNotificationsRead(userId as string),
    onSuccess: () => {
      toast.success("All notifications marked as read");
      void queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const items = query.data ?? [];
  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {unread > 0 ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "You're all caught up"}
        </p>
        <Button size="sm" variant="outline" disabled={!unread || readAll.isPending} onClick={() => readAll.mutate()}>
          <CheckCheck className="mr-2 size-4" /> Mark all read
        </Button>
      </div>

      <DataState
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={items.length === 0}
        onRetry={() => void query.refetch()}
        empty={<EmptyState icon={Bell} title="No notifications" description="Updates about your requests appear here." />}
      >
        <div className="space-y-2">
          {items.map((n) => (
            <Card key={n.id} className={cn(!n.is_read && "border-primary/40 bg-primary/5")}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!n.is_read ? (
                  <Button size="sm" variant="ghost" onClick={() => readOne.mutate(n.id)}>
                    Mark read
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </DataState>
    </div>
  );
}
