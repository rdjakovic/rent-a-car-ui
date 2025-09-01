import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useBookingFlow } from "@/hooks/useBookingFlow";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import CustomerSelection from "./CustomerSelection";
import BookingReview from "./BookingReview";
import BookingConfirmation from "./BookingConfirmation";
import BookingBreadcrumbs from "../components/BookingBreadcrumbs";

export default function BookingWizard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingFlow = useBookingFlow();

  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const initializeBooking = async () => {
      // Only initialize if we don't already have booking details
      if (!bookingFlow.bookingDetails) {
        // Start loading immediately to show loading state
        bookingFlow.setLoading(true);

        try {
          // Try to initialize from URL parameters (validation and error handling happens inside)
          const initialized = await bookingFlow.initializeFromUrlParams(searchParams);

          if (initialized) {
            setRetryCount(0);
          }
        } catch (error) {
          console.error('Failed to initialize booking from URL parameters:', error);
          bookingFlow.setInitializationError('Failed to load booking details. Please try again.');
        } finally {
          bookingFlow.setLoading(false);
        }
      }
    };

    initializeBooking();
  }, [searchParams]); // Only depend on searchParams to avoid infinite loops

  const handleCancel = () => {
    bookingFlow.reset();
    navigate('/');
  };

  const handleRetryInitialization = async () => {
    setRetryCount(prev => prev + 1);
    bookingFlow.setInitializationError(null);
    bookingFlow.setLoading(true);

    try {
      const initialized = await bookingFlow.initializeFromUrlParams(searchParams);
      if (!initialized && !bookingFlow.initializationError) {
        bookingFlow.setInitializationError('Invalid booking parameters. Please start from the availability search.');
      }
    } catch (error) {
      console.error('Retry failed:', error);
      bookingFlow.setInitializationError('Failed to load booking details. Please try again.');
    } finally {
      bookingFlow.setLoading(false);
    }
  };

  const handleGoToAvailability = () => {
    bookingFlow.reset();
    navigate('/');
  };

  // Handle initialization errors
  if (bookingFlow.initializationError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive" className="mb-6" data-testid="booking-error">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription data-testid="booking-error-message">
              {bookingFlow.initializationError}
            </AlertDescription>
          </Alert>

          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Unable to Load Booking</h2>
            <p className="text-gray-600">
              We couldn't load your booking details. This might be due to invalid parameters or an expired session.
            </p>

            <div className="flex justify-center gap-4">
              {retryCount < 3 && (
                <Button onClick={handleRetryInitialization} variant="outline" className="flex items-center gap-2" data-testid="retry-button">
                  <RefreshCw className="h-4 w-4" />
                  Retry ({3 - retryCount} attempts left)
                </Button>
              )}
              <Button onClick={handleGoToAvailability} data-testid="start-new-search-button">
                Start New Search
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state - show loading when explicitly loading or when we don't have data yet and no error
  if (bookingFlow.isLoading) {
    return (
      <div className="container mx-auto px-4 py-8" data-testid="booking-loading">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-pulse space-y-4" data-testid="loading-skeleton">
            <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
          <p className="mt-4 text-gray-600" data-testid="loading-message">Loading booking details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <BookingBreadcrumbs
          currentStep={bookingFlow.currentStep}
          carDisplayName={bookingFlow.carDetails?.displayName}
        />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="booking-title">Book Your Rental</h1>
          <div className="flex items-center space-x-4 text-sm text-gray-600" data-testid="step-indicators">
            <span className={`px-3 py-1 rounded-full ${bookingFlow.currentStep === 'customer' ? 'bg-blue-100 text-blue-800' :
              bookingFlow.isStepComplete('customer') ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`} data-testid="step-customer">
              1. Customer Selection
            </span>
            <span className={`px-3 py-1 rounded-full ${bookingFlow.currentStep === 'review' ? 'bg-blue-100 text-blue-800' :
              bookingFlow.isStepComplete('review') ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`} data-testid="step-review">
              2. Review & Confirm
            </span>
            <span className={`px-3 py-1 rounded-full ${bookingFlow.currentStep === 'confirmation' ? 'bg-blue-100 text-blue-800' :
              bookingFlow.isStepComplete('confirmation') ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`} data-testid="step-confirmation">
              3. Confirmation
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6" data-testid="booking-content">
          {bookingFlow.currentStep === 'customer' && (
            <CustomerSelection
              onBack={handleCancel}
              onNext={bookingFlow.nextStep}
              backButtonText="Cancel"
            />
          )}

          {bookingFlow.currentStep === 'review' && (
            <BookingReview
              onBack={bookingFlow.previousStep}
              onSubmit={bookingFlow.nextStep}
            />
          )}

          {bookingFlow.currentStep === 'confirmation' && (
            <BookingConfirmation
              onNewBooking={() => {
                bookingFlow.reset();
                navigate('/');
              }}
            />
          )}
        </div>

        {/* Booking Summary Sidebar */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4" data-testid="booking-summary">
          <h3 className="font-semibold text-gray-900 mb-3">Booking Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Car:</span>
              <span className="font-medium" data-testid="summary-car">{bookingFlow.carDetails?.displayName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pickup Date:</span>
              <span className="font-medium" data-testid="summary-start-date">{bookingFlow.bookingDetails?.startDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Return Date:</span>
              <span className="font-medium" data-testid="summary-end-date">{bookingFlow.bookingDetails?.endDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium" data-testid="summary-duration">{bookingFlow.totalDays} days</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600">Total Cost:</span>
              <span className="font-bold text-lg" data-testid="summary-total-cost">${bookingFlow.totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}