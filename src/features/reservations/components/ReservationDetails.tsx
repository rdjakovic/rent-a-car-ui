import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getReservationById, 
  updateReservation, 
  confirmReservation, 
  cancelReservation, 
  completeReservation,
  type ReservationResponseDto,
  type ReservationRequestDto 
} from "@/lib/api/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, User, Car, MapPin, DollarSign, Clock, Edit, Check, X, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface ReservationDetailsProps {
  reservation: ReservationResponseDto;
  onUpdate?: (updatedReservation: ReservationResponseDto) => void;
}

export function ReservationDetails({ reservation, onUpdate }: ReservationDetailsProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();

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
      return format(new Date(dateString), "EEEE, MMMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM dd, yyyy 'at' h:mm a");
    } catch {
      return dateString;
    }
  };

  // Mutation for confirming reservation
  const confirmMutation = useMutation({
    mutationFn: () => confirmReservation(reservation.id!),
    onSuccess: (updatedReservation) => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      onUpdate?.(updatedReservation);
      toast({
        title: "Reservation Confirmed",
        description: `Reservation #${reservation.id} has been confirmed.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to confirm reservation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for cancelling reservation
  const cancelMutation = useMutation({
    mutationFn: () => cancelReservation(reservation.id!),
    onSuccess: (updatedReservation) => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      onUpdate?.(updatedReservation);
      toast({
        title: "Reservation Cancelled",
        description: `Reservation #${reservation.id} has been cancelled.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to cancel reservation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for completing reservation
  const completeMutation = useMutation({
    mutationFn: () => completeReservation(reservation.id!),
    onSuccess: (updatedReservation) => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      onUpdate?.(updatedReservation);
      toast({
        title: "Reservation Completed",
        description: `Reservation #${reservation.id} has been marked as completed.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to complete reservation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleConfirm = () => {
    if (reservation.status === "PENDING") {
      confirmMutation.mutate();
    }
  };

  const handleCancel = () => {
    if (reservation.status === "PENDING" || reservation.status === "CONFIRMED") {
      cancelMutation.mutate();
    }
  };

  const handleComplete = () => {
    if (reservation.status === "CONFIRMED") {
      completeMutation.mutate();
    }
  };

  const canConfirm = reservation.status === "PENDING";
  const canCancel = reservation.status === "PENDING" || reservation.status === "CONFIRMED";
  const canComplete = reservation.status === "CONFIRMED";
  const canEdit = reservation.status === "PENDING" || reservation.status === "CONFIRMED";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reservation #{reservation.id}</h2>
          <p className="text-muted-foreground">
            Created {formatDateTime(reservation.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusBadgeVariant(reservation.status)} className="text-sm">
            {reservation.status?.charAt(0) + reservation.status?.slice(1).toLowerCase()}
          </Badge>
          <div className="flex gap-2">
            {canEdit && (
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Reservation</DialogTitle>
                  </DialogHeader>
                  <div className="text-center py-8 text-muted-foreground">
                    Reservation editing functionality will be implemented in a future update.
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {canConfirm && (
              <Button 
                size="sm" 
                onClick={handleConfirm}
                disabled={confirmMutation.isPending}
              >
                <Check className="h-4 w-4 mr-1" />
                {confirmMutation.isPending ? "Confirming..." : "Confirm"}
              </Button>
            )}
            {canComplete && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleComplete}
                disabled={completeMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                {completeMutation.isPending ? "Completing..." : "Complete"}
              </Button>
            )}
            {canCancel && (
              <Button 
                size="sm" 
                variant="destructive"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
              >
                <X className="h-4 w-4 mr-1" />
                {cancelMutation.isPending ? "Cancelling..." : "Cancel"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="text-lg font-medium">
                {reservation.customer?.fullName || 
                 `${reservation.customer?.firstName} ${reservation.customer?.lastName}`}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p>{reservation.customer?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Phone</label>
              <p>{reservation.customer?.phone || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Driver License</label>
              <p>{reservation.customer?.driverLicenseNo}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Address</label>
              <p>{reservation.customer?.address}, {reservation.customer?.city}, {reservation.customer?.country}</p>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehicle Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Vehicle</label>
              <p className="text-lg font-medium">
                {reservation.car?.displayName || 
                 `${reservation.car?.make} ${reservation.car?.model}`}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Category</label>
              <p>{reservation.car?.category}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Transmission</label>
              <p>{reservation.car?.transmission}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Fuel Type</label>
              <p>{reservation.car?.fuelType}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Seats</label>
              <p>{reservation.car?.seats}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Color</label>
              <p>{reservation.car?.color}</p>
            </div>
          </CardContent>
        </Card>

        {/* Rental Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Rental Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Pickup Date</label>
              <p className="text-lg font-medium">{formatDate(reservation.startDate)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Return Date</label>
              <p className="text-lg font-medium">{formatDate(reservation.endDate)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Duration</label>
              <p className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {reservation.durationDays} days
              </p>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Pickup Location</label>
              <p className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {reservation.pickupBranch?.name}
              </p>
              <p className="text-sm text-muted-foreground ml-5">
                {reservation.pickupBranch?.address}, {reservation.pickupBranch?.city}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Return Location</label>
              <p className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {reservation.dropoffBranch?.name}
              </p>
              <p className="text-sm text-muted-foreground ml-5">
                {reservation.dropoffBranch?.address}, {reservation.dropoffBranch?.city}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Daily Rate</label>
              <p className="text-lg font-medium">
                {formatCurrency(reservation.dailyRate, reservation.currency)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Duration</label>
              <p>{reservation.durationDays} days</p>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(reservation.totalPrice, reservation.currency)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {reservation.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{reservation.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}