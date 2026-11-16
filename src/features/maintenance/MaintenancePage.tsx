import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  listBranches,
  listCarsDueForService,
  listMaintenance,
  type CarResponseDto,
  type MaintenanceSearchParams,
  type MaintenanceStatus,
  type MaintenanceType,
} from "@/lib/api/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CalendarClock, Filter, ShieldAlert, Wrench } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useCan } from "@/lib/auth/authStore";
import { formatMileage } from "@/lib/units";
import { daysFromToday, todayString } from "@/lib/dates";
import { MaintenanceFormDialog } from "./MaintenanceFormDialog";
import {
  MAINTENANCE_STATUSES,
  MAINTENANCE_TYPES,
  formatCost,
  isOpenRecall,
  isOverdue,
  statusBadgeVariant,
  statusLabel,
  typeLabel,
} from "./maintenance";

const PAGE_SIZE = 10;
const DUE_WITHIN_DAYS = 14;

type Filters = {
  status: MaintenanceStatus | "ALL";
  type: MaintenanceType | "ALL";
  branchId: string;
  startDate: string;
  endDate: string;
};

const NO_FILTERS: Filters = { status: "ALL", type: "ALL", branchId: "ALL", startDate: "", endDate: "" };

/** Count of jobs matching a filter (one-row page; only totalElements is used). */
function useJobCount(name: string, params: MaintenanceSearchParams) {
  return useQuery({
    queryKey: ["maintenance", "count", name, params],
    queryFn: () => listMaintenance({ ...params, page: 0, size: 1 }),
    select: (page) => page.totalElements ?? 0,
    staleTime: 30_000,
  });
}

export default function MaintenancePage() {
  const canSchedule = useCan()("MAINTENANCE_SCHEDULE");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [page, setPage] = useState(0);
  const [scheduleFor, setScheduleFor] = useState<{ car?: CarResponseDto } | null>(null);
  const settings = useSettings();

  const today = todayString();
  const yesterday = daysFromToday(-1);
  const inAWeek = daysFromToday(7);

  // Overview counts
  const inProgress = useJobCount("in-progress", { status: "IN_PROGRESS" });
  const overdue = useJobCount("overdue", { status: "SCHEDULED", endDate: yesterday });
  const dueThisWeek = useJobCount("due-week", { status: "SCHEDULED", startDate: today, endDate: inAWeek });
  const recallsScheduled = useJobCount("recalls-scheduled", { status: "SCHEDULED", maintenanceType: "RECALL" });
  const recallsInProgress = useJobCount("recalls-in-progress", { status: "IN_PROGRESS", maintenanceType: "RECALL" });
  const openRecalls = recallsScheduled.data != null && recallsInProgress.data != null
    ? recallsScheduled.data + recallsInProgress.data
    : undefined;

  const dueCars = useQuery({
    queryKey: ["maintenance", "due-cars", DUE_WITHIN_DAYS],
    queryFn: () => listCarsDueForService(DUE_WITHIN_DAYS),
    staleTime: 30_000,
  });

  const branches = useQuery({
    queryKey: ["branches", { page: 0, size: 100 }],
    queryFn: () => listBranches({ page: 0, size: 100 }),
    staleTime: 5 * 60_000,
  });

  const params: MaintenanceSearchParams = useMemo(() => {
    const p: MaintenanceSearchParams = { page, size: PAGE_SIZE };
    if (filters.status !== "ALL") p.status = filters.status;
    if (filters.type !== "ALL") p.maintenanceType = filters.type;
    if (filters.branchId !== "ALL") p.branchId = Number(filters.branchId);
    if (filters.startDate) p.startDate = filters.startDate;
    if (filters.endDate) p.endDate = filters.endDate;
    return p;
  }, [filters, page]);

  useEffect(() => setPage(0), [filters]);

  const jobsQuery = useQuery({
    queryKey: ["maintenance", "list", params],
    queryFn: () => listMaintenance(params),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });

  const jobs = jobsQuery.data?.content ?? [];
  const current = jobsQuery.data?.number ?? page;
  const totalPages = jobsQuery.data?.totalPages ?? 0;
  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  return (
    <div className="container mx-auto py-6 px-4 grid grid-cols-1 gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-charcoal">Maintenance</h1>
          <p className="text-muted-foreground">Service schedule, repairs and recalls across the fleet</p>
        </div>
        {canSchedule && (
          <Button onClick={() => setScheduleFor({})}>
            <Wrench className="h-4 w-4 mr-2" aria-hidden="true" /> Schedule maintenance
          </Button>
        )}
      </div>

      {/* Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="In progress"
          hint="Cars in the shop"
          value={inProgress.data}
          onClick={() => setFilters({ ...NO_FILTERS, status: "IN_PROGRESS" })}
        />
        <SummaryCard
          label="Overdue"
          hint="Scheduled date passed, not started"
          value={overdue.data}
          tone={overdue.data ? "danger" : undefined}
          onClick={() => setFilters({ ...NO_FILTERS, status: "SCHEDULED", endDate: yesterday })}
        />
        <SummaryCard
          label="Due in 7 days"
          hint="Scheduled from today"
          value={dueThisWeek.data}
          onClick={() => setFilters({ ...NO_FILTERS, status: "SCHEDULED", startDate: today, endDate: inAWeek })}
        />
        <SummaryCard
          label="Open recalls"
          hint="Must be fixed before renting"
          value={openRecalls}
          tone={openRecalls ? "danger" : undefined}
          onClick={() => setFilters({ ...NO_FILTERS, type: "RECALL" })}
        />
      </div>

      {/* Cars due for service */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarClock className="h-5 w-5" aria-hidden="true" /> Due for service
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Cars whose next service is due within {DUE_WITHIN_DAYS} days and that have nothing scheduled yet
          </p>
        </CardHeader>
        <CardContent>
          {dueCars.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : dueCars.isError ? (
            <p className="text-sm text-destructive">Could not load cars due for service.</p>
          ) : (dueCars.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No cars are coming due for service.</p>
          ) : (
            <ul className="divide-y">
              {dueCars.data!.map((car) => {
                const late = !!car.nextServiceDate && car.nextServiceDate < today;
                return (
                  <li key={car.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <Link to={`/cars/${car.id}`} className="font-medium hover:underline">{car.displayName}</Link>
                      <p className="text-sm text-muted-foreground">
                        {[car.licensePlate, car.branch?.name, formatMileage(car.mileage, settings.data?.mileageUnit)]
                          .filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm">
                        {late ? "Was due" : "Due"} {car.nextServiceDate}
                      </span>
                      {late && <Badge variant="destructive">Overdue</Badge>}
                      {canSchedule && (
                        <Button size="sm" variant="outline" onClick={() => setScheduleFor({ car })}>Schedule</Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" aria-hidden="true" /> Filter jobs
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={() => setFilters(NO_FILTERS)}>Clear filters</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label htmlFor="filter-status" className="block text-sm font-medium mb-1">Status</label>
              <Select value={filters.status} onValueChange={(v) => setFilter("status", v as Filters["status"])}>
                <SelectTrigger id="filter-status" aria-label="Status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {MAINTENANCE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="filter-type" className="block text-sm font-medium mb-1">Type</label>
              <Select value={filters.type} onValueChange={(v) => setFilter("type", v as Filters["type"])}>
                <SelectTrigger id="filter-type" aria-label="Type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All types</SelectItem>
                  {MAINTENANCE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="filter-branch" className="block text-sm font-medium mb-1">Branch</label>
              <Select value={filters.branchId} onValueChange={(v) => setFilter("branchId", v)}>
                <SelectTrigger id="filter-branch" aria-label="Branch"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All branches</SelectItem>
                  {(branches.data?.content ?? []).map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="filter-from" className="block text-sm font-medium mb-1">Scheduled from</label>
              <Input id="filter-from" type="date" value={filters.startDate}
                     onChange={(e) => setFilter("startDate", e.target.value)} />
            </div>
            <div>
              <label htmlFor="filter-to" className="block text-sm font-medium mb-1">Scheduled to</label>
              <Input id="filter-to" type="date" value={filters.endDate}
                     onChange={(e) => setFilter("endDate", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg">Jobs</CardTitle>
            {jobsQuery.data && (
              <p className="text-sm text-muted-foreground">{jobsQuery.data.totalElements ?? 0} jobs</p>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {jobsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : jobsQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not load maintenance jobs</AlertTitle>
              <AlertDescription>Please try again later.</AlertDescription>
            </Alert>
          ) : jobs.length === 0 ? (
            <div className="text-center py-10">
              <Wrench className="mx-auto h-10 w-10 text-muted-foreground mb-3" aria-hidden="true" />
              <p className="font-medium">No maintenance jobs found</p>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "Try adjusting the filters."
                  : canSchedule ? "Schedule the first one with the button above." : "There is nothing scheduled yet."}
              </p>
            </div>
          ) : (
            <>
              <Table responsive>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Car</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell data-label="Job">
                        <div className="font-medium flex items-center gap-2">
                          {isOpenRecall(job) && <ShieldAlert className="h-4 w-4 text-destructive" aria-label="Open recall" />}
                          {job.description}
                        </div>
                        <div className="text-sm text-muted-foreground">#{job.id} · {typeLabel(job.maintenanceType)}</div>
                      </TableCell>
                      <TableCell data-label="Car">
                        <div className="font-medium">{job.car?.displayName}</div>
                        <div className="text-sm text-muted-foreground">{job.car?.branchName}</div>
                      </TableCell>
                      <TableCell data-label="Scheduled" className="sm:whitespace-nowrap">
                        <div>{job.scheduledDate}</div>
                        {isOverdue(job) && (
                          <Badge variant="destructive" className="mt-1">
                            <AlertTriangle className="h-3 w-3 mr-1" aria-hidden="true" /> Overdue
                          </Badge>
                        )}
                        {job.completedDate && (
                          <div className="text-sm text-muted-foreground">Done {job.completedDate}</div>
                        )}
                      </TableCell>
                      <TableCell data-label="Status">
                        <Badge variant={statusBadgeVariant(job.status)} className="whitespace-nowrap">{statusLabel(job.status)}</Badge>
                      </TableCell>
                      <TableCell data-label="Cost" className="sm:text-right">{formatCost(job.cost, job.currency) ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/maintenance/${job.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
                  <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))}
                          disabled={current === 0 || jobsQuery.isFetching}>
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-4">Page {current + 1} of {totalPages}</span>
                  <Button variant="outline" onClick={() => setPage((p) => p + 1)}
                          disabled={current >= totalPages - 1 || jobsQuery.isFetching}>
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {canSchedule && (
        <MaintenanceFormDialog
          open={scheduleFor !== null}
          onOpenChange={(open) => !open && setScheduleFor(null)}
          car={scheduleFor?.car?.id ? { id: scheduleFor.car.id, displayName: scheduleFor.car.displayName } : undefined}
          defaultType={scheduleFor?.car ? "ROUTINE" : undefined}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, hint, value, tone, onClick }: {
  label: string;
  hint: string;
  value: number | undefined;
  tone?: "danger";
  onClick: () => void;
}): ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-lg border bg-card p-4 shadow-sm hover:border-brand-orange transition-colors"
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-3xl font-bold ${tone === "danger" ? "text-destructive" : "text-charcoal"}`}>
        {value ?? "–"}
      </p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </button>
  );
}
