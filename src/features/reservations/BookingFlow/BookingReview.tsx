import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useBookingFlow } from "@/hooks/useBookingFlow";
import { createReservation } from "@/lib/api/queries";
import type { ReservationRequestDto } from "@/lib/api/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Calendar, Car, User, MapPin, DollarSign } from "lucide-react";

interface BookingReviewProps {
  onBack: () => void;
  onSubmit: () => void;
}

export default function BookingReview({ onBack, onSubmit }: BookingReviewProps) {
  const bookingFlow = useBookingFlow();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const createReservationMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: (reservation) => {
      bookingFlow.setReservation(reservation);
      onSubmit();
    },
    onError: (error) => {
      console.error('Failed to create reservation:', error);
      setValidationErrors([
        error instanceof Error ? error.message : 'Failed to create reservation. Please try again.'
      ]);
    },
  });

  const validateBooking = (): string[] => {
    const errors: string[] = [];

    if (!bookingFlow.customer) {
      errors.push('Customer selection is required');
    }

    if (!bookingFlow.carDetails) {
      errors.push('Car details are missing');
    }

    if (!bookingFlow.bookingDetails) {
      errors.push('Booking details are missing');
    }

    if (bookingFlow.totalDays <= 0) {
      errors.push('Invalid rental duration');
    }

    if (bookingFlow.totalCost <= 0) {
      errors.push('Invalid total cost calculation');
    }

    // Validate dates
    if (bookingFlow.bookingDetails) {
      const startDate = new Date(bookingFlow.bookingDetails.startDate);
      const endDate = new Date(bookingFlow.bookingDetails.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) {
        errors.push('Pickup date cannot be in the past');
      }

      if (endDate <= startDate) {
        errors.push('Return date must be after pickup date');
      }
    }

    return errors;
  };

  const handleSubmit = () => {
    const errors = validateBooking();
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    if (!bookingFlow.customer || !bookingFlow.carDetails || !bookingFlow.bookingDetails) {
      setValidationErrors(['Missing required booking information']);
      return;
    }

    const reservationRequest: ReservationRequestDto = {
      customerId: bookingFlow.customer.id!,
      carId: bookingFlow.carDetails.id,
      startDate: bookingFlow.bookingDetails.startDate,
      endDate: bookingFlow.bookingDetails.endDate,
      pickupBranchId: bookingFlow.bookingDetails.branchId,
      dropoffBranchId: bookingFlow.bookingDetails.branchId, // Same branch for now
      totalPrice: bookingFlow.totalCost,
      dailyRate: bookingFlow.bookingDetails.dailyPrice,
      currency: 'USD',
      notes: '',
    };

    setValidationErrors([]);
    createReservationMutation.mutate(reservationRequest);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!bookingFlow.customer || !bookingFlow.carDetails || !bookingFlow.bookingDetails) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Missing booking information. Please go back and complete all steps.</p>
        <Button onClick={onBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Booking</h2>
        <p className="text-gray-600">Please review all details before confirming your reservation.</p>
      </div>

      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-semibold text-lg">
                {bookingFlow.customer.firstName} {bookingFlow.customer.lastName}
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span>{bookingFlow.customer.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span>{bookingFlow.customer.phone || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Driver License:</span>
                <span>{bookingFlow.customer.driverLicenseNo}</span>
              </div>
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
          <CardContent className="space-y-3">
            <div>
              <p className="font-semibold text-lg">{bookingFlow.carDetails.displayName}</p>
              <Badge variant="secondary" className="mt-1">
                {bookingFlow.carDetails.category}
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Daily Rate:</span>
                <span className="font-medium">${bookingFlow.bookingDetails.dailyPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Branch:</span>
                <span>{bookingFlow.carDetails.branchName}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rental Period */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Rental Period
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Pickup Date</p>
                <p className="font-medium">{formatDate(bookingFlow.bookingDetails.startDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Return Date</p>
                <p className="font-medium">{formatDate(bookingFlow.bookingDetails.endDate)}</p>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Duration:</span>
                <span className="font-semibold">{bookingFlow.totalDays} day{bookingFlow.totalDays !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pickup & Return Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Pickup & Return Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Pickup Location</p>
                <p className="font-medium">{bookingFlow.carDetails.branchName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Return Location</p>
                <p className="font-medium">{bookingFlow.carDetails.branchName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cost Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Daily Rate:</span>
              <span>${bookingFlow.bookingDetails.dailyPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Number of Days:</span>
              <span>{bookingFlow.totalDays}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total Cost:</span>
              <span className="text-2xl font-bold text-green-600">
                ${bookingFlow.totalCost.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * Taxes and fees may apply at pickup
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6">
        <Button 
          variant="outline" 
          onClick={onBack}
          disabled={createReservationMutation.isPending}
        >
          Back to Customer Selection
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={createReservationMutation.isPending}
          className="min-w-[140px]"
        >
          {createReservationMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Confirm Booking'
          )}
        </Button>
      </div>
    </div>
  );
}