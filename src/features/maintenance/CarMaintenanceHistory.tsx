import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listMaintenance, type CarResponseDto } from "@/lib/api/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/lib/auth/authStore";
import { MaintenanceFormDialog } from "./MaintenanceFormDialog";
import { formatCost, isOverdue, statusBadgeVariant, statusLabel, typeLabel } from "./maintenance";

const HISTORY_SIZE = 5;

/** The car's latest maintenance jobs (newest scheduled date first) with a shortcut to schedule one. */
export function CarMaintenanceHistory({ car }: { car: CarResponseDto }) {
  const canSchedule = useCan()("MAINTENANCE_SCHEDULE");
  const [scheduling, setScheduling] = useState(false);
  const params = { carId: car.id, page: 0, size: HISTORY_SIZE };

  const history = useQuery({
    queryKey: ["maintenance", "list", params],
    queryFn: () => listMaintenance(params),
    enabled: !!car.id,
  });
  const jobs = history.data?.content ?? [];
  const total = history.data?.totalElements ?? 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">Maintenance history</CardTitle>
          {canSchedule && (
            <Button size="sm" variant="outline" onClick={() => setScheduling(true)}>Schedule maintenance</Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {history.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : history.isError ? (
          <p className="text-sm text-muted-foreground">Maintenance history is not available.</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No maintenance recorded for this car.</p>
        ) : (
          <ul className="divide-y">
            {jobs.map((job) => (
              <li key={job.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <Link to={`/maintenance/${job.id}`} className="font-medium hover:underline">{job.description}</Link>
                  <p className="text-muted-foreground">
                    {typeLabel(job.maintenanceType)} · {job.completedDate ?? job.scheduledDate}
                    {formatCost(job.cost, job.currency) && ` · ${formatCost(job.cost, job.currency)}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  {isOverdue(job) && <Badge variant="destructive">Overdue</Badge>}
                  <Badge variant={statusBadgeVariant(job.status)}>{statusLabel(job.status)}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
        {total > HISTORY_SIZE && (
          <p className="text-xs text-muted-foreground mt-2">Showing the latest {HISTORY_SIZE} of {total} jobs.</p>
        )}
      </CardContent>

      {canSchedule && (
        <MaintenanceFormDialog
          open={scheduling}
          onOpenChange={setScheduling}
          car={{ id: car.id!, displayName: car.displayName }}
        />
      )}
    </Card>
  );
}
