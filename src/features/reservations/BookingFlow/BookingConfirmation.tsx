import { useNavigate } from "react-router-dom";
import { useBookingFlow } from "@/hooks/useBookingFlow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  Calendar, 
  Car, 
  User, 
  MapPin, 
  DollarSign, 
  Printer,
  Plus,
  ArrowLeft,
  FileText
} from "lucide-react";

interface BookingConfirmationProps {
  onNewBooking: () => void;
}

export default function BookingConfirmation({ onNewBooking }: BookingConfirmationProps) {
  const navigate = useNavigate();
  const bookingFlow = useBookingFlow();

  const handlePrintConfirmation = () => {
    // Create a printable version of the confirmation
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const reservation = bookingFlow.reservation;
    if (!reservation) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reservation Confirmation - ${reservation.id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .confirmation-number { font-size: 24px; font-weight: bold; color: #059669; }
            .section { margin-bottom: 20px; }
            .section-title { font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .total { font-size: 18px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Car Rental Confirmation</h1>
            <div class="confirmation-number">Reservation #${reservation.id}</div>
            <p>Status: ${reservation.status}</p>
          </div>
          
          <div class="section">
            <div class="section-title">Customer Information</div>
            <div class="detail-row">
              <span>Name:</span>
              <span>${reservation.customer?.firstName} ${reservation.customer?.lastName}</span>
            </div>
            <div class="detail-row">
              <span>Email:</span>
              <span>${reservation.customer?.email}</span>
            </div>
            <div class="detail-row">
              <span>Phone:</span>
              <span>${reservation.customer?.phone || 'Not provided'}</span>
            </div>
            <div class="detail-row">
              <span>Driver License:</span>
              <span>${reservation.customer?.driverLicenseNo}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Vehicle Information</div>
            <div class="detail-row">
              <span>Vehicle:</span>
              <span>${reservation.car?.displayName}</span>
            </div>
            <div class="detail-row">
              <span>Category:</span>
              <span>${reservation.car?.category}</span>
            </div>
            <div class="detail-row">
              <span>Daily Rate:</span>
              <span>$${reservation.dailyRate?.toFixed(2)}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Rental Period</div>
            <div class="detail-row">
              <span>Pickup Date:</span>
              <span>${new Date(reservation.startDate!).toLocaleDateString()}</span>
            </div>
            <div class="detail-row">
              <span>Return Date:</span>
              <span>${new Date(reservation.endDate!).toLocaleDateString()}</span>
            </div>
            <div class="detail-row">
              <span>Duration:</span>
              <span>${reservation.durationDays} day${reservation.durationDays !== 1 ? 's' : ''}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Pickup & Return Location</div>
            <div class="detail-row">
              <span>Pickup Location:</span>
              <span>${reservation.pickupBranch?.name}</span>
            </div>
            <div class="detail-row">
              <span>Return Location:</span>
              <span>${reservation.dropoffBranch?.name}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Cost Summary</div>
            <div class="detail-row">
              <span>Daily Rate:</span>
              <span>$${reservation.dailyRate?.toFixed(2)}</span>
            </div>
            <div class="detail-row">
              <span>Number of Days:</span>
              <span>${reservation.durationDays}</span>
            </div>
            <div class="detail-row total">
              <span>Total Cost:</span>
              <span>$${reservation.totalPrice?.toFixed(2)}</span>
            </div>
          </div>

          <div class="section">
            <p><strong>Important Notes:</strong></p>
            <ul>
              <li>Please bring a valid driver's license and credit card for pickup</li>
              <li>Arrive at least 15 minutes before your scheduled pickup time</li>
              <li>Additional fees may apply for late returns or damages</li>
              <li>Contact us at least 24 hours in advance for any changes</li>
            </ul>
          </div>

          <div class="section">
            <p>Thank you for choosing our car rental service!</p>
            <p>Confirmation generated on: ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const handleNewSearch = () => {
    bookingFlow.reset();
    navigate('/');
  };

  const handleViewReservations = () => {
    navigate('/reservations');
  };

  const handleNewBookingClick = () => {
    onNewBooking();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'default';
      case 'PENDING':
        return 'secondary';
      case 'CANCELLED':
        return 'destructive';
      case 'COMPLETED':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (!bookingFlow.reservation) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No reservation found. Please complete the booking process.</p>
        <Button onClick={() => navigate('/')} className="mt-4">
          Start New Booking
        </Button>
      </div>
    );
  }

  const reservation = bookingFlow.reservation;

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-green-800 mb-2">Booking Confirmed!</h2>
        <p className="text-green-700 mb-4">Your reservation has been successfully created.</p>
        <div className="bg-white rounded-lg p-4 inline-block shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Reservation Number</p>
          <p className="text-2xl font-bold text-gray-900">#{reservation.id}</p>
          <Badge variant={getStatusBadgeVariant(reservation.status!)} className="mt-2">
            {reservation.status}
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button onClick={handlePrintConfirmation} variant="outline" className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Print Confirmation
        </Button>
        <Button onClick={handleNewBookingClick} variant="outline" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Booking
        </Button>
        <Button onClick={handleViewReservations} className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          View All Reservations
        </Button>
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
          <CardContent className="space-y-3">
            <div>
              <p className="font-semibold text-lg">
                {reservation.customer?.firstName} {reservation.customer?.lastName}
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span>{reservation.customer?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span>{reservation.customer?.phone || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Driver License:</span>
                <span>{reservation.customer?.driverLicenseNo}</span>
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
              <p className="font-semibold text-lg">{reservation.car?.displayName}</p>
              <Badge variant="secondary" className="mt-1">
                {reservation.car?.category}
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Daily Rate:</span>
                <span className="font-medium">${reservation.dailyRate?.toFixed(2)}</span>
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
                <p className="font-medium">{formatDate(reservation.startDate!)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Return Date</p>
                <p className="font-medium">{formatDate(reservation.endDate!)}</p>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Duration:</span>
                <span className="font-semibold">
                  {reservation.durationDays} day{reservation.durationDays !== 1 ? 's' : ''}
                </span>
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
                <p className="font-medium">{reservation.pickupBranch?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Return Location</p>
                <p className="font-medium">{reservation.dropoffBranch?.name}</p>
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
            Final Cost Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Daily Rate:</span>
              <span>${reservation.dailyRate?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Number of Days:</span>
              <span>{reservation.durationDays}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total Paid:</span>
              <span className="text-2xl font-bold text-green-600">
                ${reservation.totalPrice?.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Currency: {reservation.currency || 'USD'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Important Information */}
      <Card>
        <CardHeader>
          <CardTitle>Important Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Before Pickup:</h4>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Bring a valid driver's license and credit card</li>
                <li>Arrive at least 15 minutes before your scheduled pickup time</li>
                <li>Ensure your driver's license is not expired</li>
              </ul>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg">
              <h4 className="font-semibold text-amber-800 mb-2">During Rental:</h4>
              <ul className="list-disc list-inside space-y-1 text-amber-700">
                <li>Additional fees may apply for late returns</li>
                <li>Report any damages immediately</li>
                <li>Keep the vehicle clean and in good condition</li>
              </ul>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Need Changes?</h4>
              <p className="text-green-700">
                Contact us at least 24 hours in advance for any modifications to your reservation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between pt-6">
        <Button 
          variant="outline" 
          onClick={handleNewSearch}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          New Availability Search
        </Button>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={handleNewBookingClick}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Another Booking
          </Button>
          <Button 
            onClick={handleViewReservations}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Manage Reservations
          </Button>
        </div>
      </div>
    </div>
  );
}