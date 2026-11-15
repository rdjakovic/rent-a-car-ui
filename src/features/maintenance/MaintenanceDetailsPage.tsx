import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelMaintenance,
  getCarById,
  getMaintenance,
  startMaintenance,
  type MaintenanceResponseDto,
} from "@/lib/api/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";
import { formatMileage } from "@/lib/units";
import { errorMessage } from "@/lib/api/errors";
import { useCan } from "@/lib/auth/authStore";
import { MaintenanceFormDialog } from "./MaintenanceFormDialog";
import { CompleteMaintenanceDialog } from "./CompleteMaintenanceDialog";
import {
  formatCost,
  isOpenRecall,
  isOverdue,
  statusBadgeVariant,
  statusLabel,
  typeLabel,
} from "./maintenance";

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b last:border-b-0 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value ?? "—"}</dd>
    </div>
  );
}

export default function MaintenanceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);
  const validId = Number.isInteger(jobId) && jobId > 0;
  const queryClient = useQueryClient();
  const canManage = useCan()("MAINTENANCE_MANAGE");
  const settings = useSettings();
  const [dialog, setDialog] = useState<"edit" | "complete" | "cancel" | null>(null);

  const jobQuery = useQuery({
    queryKey: ["maintenance", "detail", jobId],
    queryFn: () => getMaintenance(jobId),
    enabled: validId,
    retry: false,
  });
  const job = jobQuery.data;
  const carId = job?.car?.id;

  // Full car record for mileage, plate and service dates
  const carQuery = useQuery({
    queryKey: ["car", carId],
    queryFn: () => getCarById(carId!),
    enabled: !!carId,
  });
  const car = carQuery.data;

  // Starting, completing and cancelling also change the car (status, mileage, service dates)
  const onChanged = (updated: MaintenanceResponseDto, title: string) => {
    queryClient.setQueryData(["maintenance", "detail", jobId], updated);
    queryClient.invalidateQueries({ queryKey: ["maintenance"] });
    queryClient.invalidateQueries({ queryKey: ["car", carId] });
    queryClient.invalidateQueries({ queryKey: ["cars"] });
    toast({ title });
  };
  const onFailed = (error: unknown) =>
    toast({ title: "Action failed", description: errorMessage(error), variant: "destructive" });

  const start = useMutation({
    mutationFn: () => startMaintenance(jobId),
    onSuccess: (updated) => onChanged(updated, "Maintenance started"),
    onError: onFailed,
  });
  const cancel = useMutation({
    mutationFn: () => cancelMaintenance(jobId),
    onSuccess: (updated) => {
      setDialog(null);
      onChanged(updated, "Maintenance cancelled");
    },
    onError: onFailed,
  });

  const backLink = (
    <Link to="/maintenance" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-charcoal">
      <ArrowLeft className="h-4 w-4" /> Back to maintenance
    </Link>
  );

  if (jobQuery.isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 grid grid-cols-1 gap-6" aria-busy="true">
        {backLink}
        <Skeleton className="h-10 w-80" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (jobQuery.isError || !job) {
    return (
      <div className="container mx-auto py-6 px-4 grid grid-cols-1 gap-6">
        {backLink}
        <Alert variant="destructive">
          <AlertTitle>Maintenance job not found</AlertTitle>
          <AlertDescription>
            {validId ? `We couldn't load maintenance job #${id}.` : "This maintenance link is not valid."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const unit = settings.data?.mileageUnit;
  const busy = start.isPending || cancel.isPending;

  return (
    <div className="container mx-auto py-6 px-4 grid grid-cols-1 gap-6">
      {backLink}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-charcoal">{job.description}</h1>
        <p className="text-muted-foreground">Maintenance job #{job.id} · {job.car?.displayName}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="secondary">{typeLabel(job.maintenanceType)}</Badge>
          <Badge variant={statusBadgeVariant(job.status)}>{statusLabel(job.status)}</Badge>
          {isOverdue(job) && <Badge variant="destructive">Overdue</Badge>}
        </div>
      </div>

      {isOpenRecall(job) && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Open safety recall</AlertTitle>
          <AlertDescription>
            A car with an open recall must not be rented until the repair is done.
            {job.status === "SCHEDULED" && " Starting the job takes the car out of service."}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid grid-cols-1 gap-6 lg:col-span-2 content-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Job</CardTitle>
            </CardHeader>
            <CardContent>
              <dl>
                <DetailRow label="Type" value={typeLabel(job.maintenanceType)} />
                <DetailRow label="Status" value={statusLabel(job.status)} />
                <DetailRow label="Scheduled date" value={job.scheduledDate} />
                <DetailRow label="Completed date" value={job.completedDate} />
                <DetailRow
                  label={job.status === "COMPLETED" ? "Cost" : "Estimated cost"}
                  value={formatCost(job.cost, job.currency)}
                />
                <DetailRow label="Odometer at service" value={formatMileage(job.odometerReading, unit)} />
                <DetailRow label="Assigned to" value={job.employeeName} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-line">{job.notes || "No notes."}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 content-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {!canManage ? (
                <p className="text-sm text-muted-foreground">
                  {job.status === "SCHEDULED" || job.status === "IN_PROGRESS"
                    ? "Starting, editing, completing and cancelling jobs is for managers."
                    : `This job is ${statusLabel(job.status).toLowerCase()}.`}
                </p>
              ) : (
                <>
                  {job.status === "SCHEDULED" && (
                    <>
                      <Button onClick={() => start.mutate()} disabled={busy}>
                        {start.isPending ? "Starting…" : "Start job"}
                      </Button>
                      <p className="text-xs text-muted-foreground">Starting marks the car as in maintenance.</p>
                      <Button variant="outline" onClick={() => setDialog("edit")} disabled={busy}>Edit</Button>
                    </>
                  )}
                  {job.status === "IN_PROGRESS" && (
                    <Button onClick={() => setDialog("complete")} disabled={busy}>Complete job</Button>
                  )}
                  {(job.status === "SCHEDULED" || job.status === "IN_PROGRESS") ? (
                    <Button variant="outline" className="text-destructive" onClick={() => setDialog("cancel")} disabled={busy}>
                      Cancel job
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">This job is {statusLabel(job.status).toLowerCase()}.</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Car</CardTitle>
            </CardHeader>
            <CardContent>
              {carId && (
                <Link to={`/cars/${carId}`} className="font-medium hover:underline">{job.car?.displayName}</Link>
              )}
              {carQuery.isLoading ? (
                <Skeleton className="h-24 w-full mt-2" />
              ) : car ? (
                <dl className="mt-2">
                  <DetailRow label="License plate" value={car.licensePlate} />
                  <DetailRow label="Branch" value={car.branch?.name} />
                  <DetailRow label="Status" value={car.status} />
                  <DetailRow label="Mileage" value={formatMileage(car.mileage, unit)} />
                  <DetailRow label="Last service" value={car.lastServiceDate} />
                  <DetailRow label="Next service" value={car.nextServiceDate} />
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">Car details are not available.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <MaintenanceFormDialog
        open={dialog === "edit"}
        onOpenChange={(open) => !open && setDialog(null)}
        job={job}
        onSaved={(updated) => queryClient.setQueryData(["maintenance", "detail", jobId], updated)}
      />

      <CompleteMaintenanceDialog
        open={dialog === "complete"}
        onOpenChange={(open) => !open && setDialog(null)}
        job={job}
        car={car}
        onCompleted={(updated) => onChanged(updated, "Maintenance completed")}
      />

      <Dialog open={dialog === "cancel"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this job?</DialogTitle>
            <DialogDescription>
              {job.status === "IN_PROGRESS"
                ? "The car goes back to available unless another job keeps it in the shop."
                : "The car can be booked on the scheduled day again."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Keep job</Button>
            <Button variant="destructive" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
              {cancel.isPending ? "Cancelling…" : "Cancel job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
