import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listReservations,
  getReservationById,
  confirmReservation,
  cancelReservation,
  type ReservationSearchParams,
  type ReservationResponseDto
} from "@/lib/api/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, User, Car, Filter, Eye, Check, X, KeyRound, CornerDownLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { RentalHandoverDialog } from "./components/RentalHandoverDialog";
import { ReservationStatusBadge } from "./components/ReservationStatusBadge";
import { canPickUp, isOverdueReturn } from "./utils/rentalStatus";
import { useReservationsFilters, useFilterField } from "@/stores/filterStore";
import { useResetPageOnChange } from "@/hooks/useResetPageOnChange";

const RESERVATION_STATUSES = ["PENDING", "CONFIRMED", "ACTIVE", "CANCELLED", "COMPLETED"] as const;

export default function ReservationsPage() {
  // Filter state
  // Kept while you move between pages
  const [search, setSearch] = useFilterField(useReservationsFilters, "search");
  const [status, setStatus] = useFilterField(useReservationsFilters, "status");
  const [startDate, setStartDate] = useFilterField(useReservationsFilters, "startDate");
  const [endDate, setEndDate] = useFilterField(useReservationsFilters, "endDate");
  // Exact lookup by reservation number; the general search needs 2 characters, so #5 couldn't be found with it
  const [reservationId, setReservationId] = useFilterField(useReservationsFilters, "reservationId");
  const [page, setPage] = useFilterField(useReservationsFilters, "page");
  const [size] = useState(10);
  
  // Pick-up/return dialog state
  const [handover, setHandover] = useState<{ mode: "pickup" | "return"; reservation: ReservationResponseDto } | null>(null);

  const queryClient = useQueryClient();

  // Build filter params
  const filterParams: ReservationSearchParams = useMemo(() => {
    const params: ReservationSearchParams = { page, size };

    // Backend searches customer name/email/phone, reservation ID, car, and branch
    // in a single call; it requires at least 2 characters.
    const trimmedSearch = search.trim();
    if (trimmedSearch.length >= 2) params.search = trimmedSearch;

    if (status && status !== "ALL") params.status = status as ReservationResponseDto["status"];
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return params;
  }, [search, status, startDate, endDate, page, size]);

  // Reset page when filters change
  useResetPageOnChange([search, status, startDate, endDate], setPage);

  // A valid reservation number replaces the list with that one reservation (other filters are ignored)
  const idDigits = reservationId.trim();
  const searchedId = /^[1-9]\d{0,14}$/.test(idDigits) ? Number(idDigits) : undefined;
  const isSearchingById = searchedId !== undefined;

  const reservationsQuery = useQuery({
    queryKey: ["reservations", filterParams],
    queryFn: () => listReservations(filterParams),
    enabled: !isSearchingById,
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  // Same key as the reservation details page, so both share the cached reservation
  const byIdQuery = useQuery({
    queryKey: ["reservations", "detail", searchedId],
    queryFn: () => getReservationById(searchedId!),
    enabled: isSearchingById,
    retry: false,
    staleTime: 30_000,
  });

  const isLoading = isSearchingById
    ? byIdQuery.isLoading
    : reservationsQuery.isLoading || (reservationsQuery.isFetching && !reservationsQuery.data);
  const reservations = useMemo<ReservationResponseDto[]>(
    () => (isSearchingById ? (byIdQuery.data ? [byIdQuery.data] : []) : reservationsQuery.data?.content ?? []),
    [isSearchingById, byIdQuery.data, reservationsQuery.data?.content]);
  const current = isSearchingById ? 0 : reservationsQuery.data?.number ?? page;
  const totalPages = isSearchingById ? 1 : reservationsQuery.data?.totalPages ?? 0;
  const hasPrev = current > 0;
  const hasNext = totalPages ? current < totalPages - 1 : false;

  // Mutation for confirming reservation
  const confirmMutation = useMutation({
    mutationFn: (reservationId: number) => confirmReservation(reservationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      toast({
        title: "Reservation Confirmed",
        description: "The reservation has been confirmed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to confirm reservation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for cancelling reservation
  const cancelMutation = useMutation({
    mutationFn: (reservationId: number) => cancelReservation(reservationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      toast({
        title: "Reservation Cancelled",
        description: "The reservation has been cancelled successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel reservation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setStartDate("");
    setEndDate("");
    setReservationId("");
    setPage(0);
  };

  const hasActiveFilters = search || reservationId || (status && status !== "ALL") || startDate || endDate;


  const handleConfirmReservation = (reservationId: number) => {
    confirmMutation.mutate(reservationId);
  };

  const handleCancelReservation = (reservationId: number) => {
    cancelMutation.mutate(reservationId);
  };

  const formatCurrency = (amount: number | undefined, currency: string | undefined) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="grid grid-cols-1 gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-charcoal">Reservations</h1>
            <p className="text-muted-foreground">Manage and track all reservations</p>
          </div>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
            {/* A booking starts from an availability search for the dates */}
            <Button asChild>
              <Link to="/">New Reservation</Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium mb-1">Search</label>
                <SearchInput
                  placeholder="Customer, car, branch or reservation ID..."
                  value={search}
                  onChange={setSearch}
                />
                {search.trim().length === 1 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Type at least 2 characters to search
                  </p>
                )}
              </div>

              {/* Reservation number */}
              <div>
                <label htmlFor="reservation-id" className="block text-sm font-medium mb-1">Reservation #</label>
                <Input
                  id="reservation-id"
                  inputMode="numeric"
                  placeholder="e.g. 12"
                  value={reservationId}
                  onChange={(e) => setReservationId(e.target.value.replace(/\D/g, ""))}
                />
                {isSearchingById && (
                  <p className="text-xs text-muted-foreground mt-1">Showing only this reservation; other filters are ignored</p>
                )}
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    {RESERVATION_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date Filter */}
              <div>
                <label htmlFor="start-date" className="block text-sm font-medium mb-1">From Date</label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              {/* End Date Filter */}
              <div>
                <label htmlFor="end-date" className="block text-sm font-medium mb-1">To Date</label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Reservations</CardTitle>
              <p className="text-sm text-muted-foreground">
                {isLoading ? (
                  "Loading reservations..."
                ) : isSearchingById ? (
                  `Reservation #${searchedId}`
                ) : (
                  `Showing ${reservations.length} reservations (Page ${current + 1} of ${Math.max(totalPages, 1)})`
                )}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : reservations.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {isSearchingById ? `No reservation #${searchedId}` : "No reservations found"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {isSearchingById
                    ? (byIdQuery.error?.message ?? "Check the number and try again")
                    : hasActiveFilters
                      ? "Try adjusting your search criteria"
                      : "No reservations have been created yet"}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <Table className="min-w-[1040px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reservation</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Car</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservations.map((reservation) => (
                      <TableRow key={reservation.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">#{reservation.id}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(reservation.createdAt)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {reservation.customer?.fullName || 
                                 `${reservation.customer?.firstName} ${reservation.customer?.lastName}`}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {reservation.customer?.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {reservation.car?.displayName || 
                                 `${reservation.car?.make} ${reservation.car?.model}`}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {reservation.car?.category}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {formatDate(reservation.startDate)} - {formatDate(reservation.endDate)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {reservation.durationDays} days
                            </div>
                            {isOverdueReturn(reservation) && (
                              <Badge variant="destructive" className="mt-1">Overdue return</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <ReservationStatusBadge status={reservation.status} />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {formatCurrency(reservation.totalPrice, reservation.currency)}
                          </div>
                          {reservation.dailyRate && (
                            <div className="text-sm text-muted-foreground">
                              {formatCurrency(reservation.dailyRate, reservation.currency)}/day
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button asChild variant="ghost" size="sm">
                              <Link to={`/reservations/${reservation.id}`}>
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Link>
                            </Button>
                            {reservation.status === "PENDING" && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleConfirmReservation(reservation.id!)}
                                disabled={confirmMutation.isPending}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                {confirmMutation.isPending ? "..." : "Confirm"}
                              </Button>
                            )}
                            {canPickUp(reservation) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setHandover({ mode: "pickup", reservation })}
                              >
                                <KeyRound className="h-4 w-4 mr-1" />
                                Pick up
                              </Button>
                            )}
                            {reservation.status === "ACTIVE" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setHandover({ mode: "return", reservation })}
                              >
                                <CornerDownLeft className="h-4 w-4 mr-1" />
                                Return
                              </Button>
                            )}
                            {(reservation.status === "PENDING" || reservation.status === "CONFIRMED") && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleCancelReservation(reservation.id!)}
                                disabled={cancelMutation.isPending}
                              >
                                <X className="h-4 w-4 mr-1" />
                                {cancelMutation.isPending ? "..." : "Cancel"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={!hasPrev || reservationsQuery.isFetching}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-4">
                      Page {current + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!hasNext || reservationsQuery.isFetching}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {handover && (
          <RentalHandoverDialog
            mode={handover.mode}
            reservation={handover.reservation}
            open
            onOpenChange={(open) => !open && setHandover(null)}
          />
        )}

      </div>
    </div>
  );
}