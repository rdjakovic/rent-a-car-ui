import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  confirmReservation,
  cancelReservation,
  type ReservationResponseDto
} from "@/lib/api/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, User, Car, MapPin, DollarSign, Clock, Edit, Check, X, KeyRound, CornerDownLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";
import { formatMileage } from "@/lib/units";
import { RentalHandoverDialog } from "./RentalHandoverDialog";
import { EditReservationDialog } from "./EditReservationDialog";
import { ReservationStatusBadge } from "./ReservationStatusBadge";
import { canPickUp, isOverdueReturn } from "../utils/rentalStatus";

interface ReservationDetailsProps {
  reservation: ReservationResponseDto;
  onUpdate?: (updatedReservation: ReservationResponseDto) => void;
}

export function ReservationDetails({ reservation, onUpdate }: ReservationDetailsProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [handoverMode, setHandoverMode] = useState<"pickup" | "return" | null>(null);
  const queryClient = useQueryClient();
  const settings = useSettings();


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
    mutationFn: () => cancelReservation(reservation.id!),
    onSuccess: (updatedReservation) => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      onUpdate?.(updatedReservation);
      toast({
        title: "Reservation Cancelled",
        description: `Reservation #${reservation.id} has been cancelled.`,
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

  const canConfirm = reservation.status === "PENDING";
  const canCancel = reservation.status === "PENDING" || reservation.status === "CONFIRMED";
  const canReturn = reservation.status === "ACTIVE";
  // The backend only accepts changes while the reservation is PENDING
  const canEdit = reservation.status === "PENDING";

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
          {isOverdueReturn(reservation) && <Badge variant="destructive" className="text-sm">Overdue return</Badge>}
          <ReservationStatusBadge status={reservation.status} className="text-sm" />
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
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
            {canPickUp(reservation) && (
              <Button size="sm" variant="outline" onClick={() => setHandoverMode("pickup")}>
                <KeyRound className="h-4 w-4 mr-1" />
                Pick up
              </Button>
            )}
            {canReturn && (
              <Button size="sm" variant="outline" onClick={() => setHandoverMode("return")}>
                <CornerDownLeft className="h-4 w-4 mr-1" />
                Return
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
            {reservation.pickedUpAt && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Picked Up</label>
                <p>
                  {formatDateTime(reservation.pickedUpAt)}
                  {reservation.mileageOut != null && ` · ${formatMileage(reservation.mileageOut, settings.data?.mileageUnit)}`}
                </p>
              </div>
            )}
            {reservation.returnedAt && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Returned</label>
                <p>
                  {formatDateTime(reservation.returnedAt)}
                  {reservation.mileageIn != null && ` · ${formatMileage(reservation.mileageIn, settings.data?.mileageUnit)}`}
                </p>
              </div>
            )}
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

      {canEdit && (
        <EditReservationDialog
          reservation={reservation}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSaved={onUpdate}
        />
      )}

      {handoverMode && (
        <RentalHandoverDialog
          mode={handoverMode}
          reservation={reservation}
          open
          onOpenChange={(open) => !open && setHandoverMode(null)}
          onDone={onUpdate}
        />
      )}

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