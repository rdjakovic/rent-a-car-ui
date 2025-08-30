import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  listReservations, 
  confirmReservation, 
  cancelReservation, 
  completeReservation,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, User, Car, Filter, Eye, Check, X, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { ReservationDetails } from "./components/ReservationDetails";

const RESERVATION_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"] as const;

export default function ReservationsPage() {
  // Filter state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  
  // Dialog state
  const [selectedReservation, setSelectedReservation] = useState<ReservationResponseDto | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // Build filter params
  const filterParams: ReservationSearchParams = useMemo(() => {
    const params: ReservationSearchParams = { page, size };
    
    if (search.trim()) {
      params.search = search.trim();
    }
    
    if (status && status !== "ALL") params.status = status as ReservationResponseDto["status"];
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return params;
  }, [search, status, startDate, endDate, page, size]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, status, startDate, endDate]);

  const reservationsQuery = useQuery({
    queryKey: ["reservations", filterParams],
    queryFn: () => listReservations(filterParams),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  const isLoading = reservationsQuery.isLoading || (reservationsQuery.isFetching && !reservationsQuery.data);
  const reservations = reservationsQuery.data?.content ?? [];
  const current = reservationsQuery.data?.number ?? page;
  const totalPages = reservationsQuery.data?.totalPages ?? 0;
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

  // Mutation for completing reservation
  const completeMutation = useMutation({
    mutationFn: (reservationId: number) => completeReservation(reservationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      toast({
        title: "Reservation Completed",
        description: "The reservation has been marked as completed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete reservation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setStartDate("");
    setEndDate("");
    setPage(0);
  };

  const hasActiveFilters = search || (status && status !== "ALL") || startDate || endDate;

  const getStatusBadgeVariant = (status: ReservationResponseDto["status"]) => {
    switch (status) {
      case "PENDING":
        return "secondary";
      case "CONFIRMED":
        return "default";
      case "CANCELLED":
        return "destructive";
      case "COMPLETED":
        return "outline";
      default:
        return "secondary";
    }
  };

  const handleViewReservation = (reservation: ReservationResponseDto) => {
    setSelectedReservation(reservation);
    setIsDetailsDialogOpen(true);
  };

  const handleConfirmReservation = (reservationId: number) => {
    confirmMutation.mutate(reservationId);
  };

  const handleCancelReservation = (reservationId: number) => {
    cancelMutation.mutate(reservationId);
  };

  const handleCompleteReservation = (reservationId: number) => {
    completeMutation.mutate(reservationId);
  };

  const handleReservationUpdate = (updatedReservation: ReservationResponseDto) => {
    // The query will be invalidated by the mutations, so we don't need to do anything here
    // This callback is mainly for the ReservationDetails component
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
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
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
            <Button>
              New Reservation
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium mb-1">Search</label>
                <SearchInput
                  placeholder="Customer name, email, phone, reservation ID, car, or branch..."
                  value={search}
                  onChange={setSearch}
                />
                {search.trim() && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Searching across all reservation and customer fields
                  </p>
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
            <div className="flex items-center justify-between">
              <CardTitle>Reservations</CardTitle>
              <p className="text-sm text-muted-foreground">
                {isLoading ? (
                  "Loading reservations..."
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
                <h3 className="text-lg font-medium mb-2">No reservations found</h3>
                <p className="text-muted-foreground mb-4">
                  {hasActiveFilters
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
                <Table>
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
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(reservation.status)}>
                            {reservation.status?.charAt(0) + reservation.status?.slice(1).toLowerCase()}
                          </Badge>
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
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewReservation(reservation)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
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
                            {reservation.status === "CONFIRMED" && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleCompleteReservation(reservation.id!)}
                                disabled={completeMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {completeMutation.isPending ? "..." : "Complete"}
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

        {/* Reservation Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Reservation Details</DialogTitle>
            </DialogHeader>
            {selectedReservation && (
              <ReservationDetails 
                reservation={selectedReservation} 
                onUpdate={handleReservationUpdate}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}