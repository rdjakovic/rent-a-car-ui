import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useBookingFlow } from "@/hooks/useBookingFlow";

export default function BookingWizard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingFlow = useBookingFlow();

  useEffect(() => {
    // Only initialize if we don't already have booking details
    if (!bookingFlow.bookingDetails) {
      // Try to initialize from URL parameters
      const initialized = bookingFlow.initializeFromUrlParams(searchParams);
      
      if (!initialized) {
        // If no valid parameters, redirect to availability page
        navigate('/');
      }
    }
  }, [searchParams, navigate, bookingFlow.bookingDetails, bookingFlow.initializeFromUrlParams]); // Only depend on specific values

  // const handleComplete = (reservationId: number) => {
  //   // Navigate to reservations page or show success
  //   navigate(`/reservations/${reservationId}`);
  // };

  const handleCancel = () => {
    bookingFlow.reset();
    navigate('/');
  };

  if (!bookingFlow.carDetails || !bookingFlow.bookingDetails) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p>Loading booking details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Your Rental</h1>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span className={`px-3 py-1 rounded-full ${
              bookingFlow.currentStep === 'customer' ? 'bg-blue-100 text-blue-800' : 
              bookingFlow.isStepComplete('customer') ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              1. Customer Selection
            </span>
            <span className={`px-3 py-1 rounded-full ${
              bookingFlow.currentStep === 'review' ? 'bg-blue-100 text-blue-800' : 
              bookingFlow.isStepComplete('review') ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              2. Review & Confirm
            </span>
            <span className={`px-3 py-1 rounded-full ${
              bookingFlow.currentStep === 'confirmation' ? 'bg-blue-100 text-blue-800' : 
              bookingFlow.isStepComplete('confirmation') ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              3. Confirmation
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {bookingFlow.currentStep === 'customer' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Select Customer</h2>
              <p className="text-gray-600">Customer selection component will be implemented in the next task.</p>
              <div className="mt-6 flex justify-between">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={bookingFlow.nextStep}
                  disabled={!bookingFlow.canProceedToReview()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next: Review
                </button>
              </div>
            </div>
          )}

          {bookingFlow.currentStep === 'review' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Review Booking</h2>
              <p className="text-gray-600">Booking review component will be implemented in a later task.</p>
              <div className="mt-6 flex justify-between">
                <button
                  onClick={bookingFlow.previousStep}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => bookingFlow.nextStep()}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Confirm Booking
                </button>
              </div>
            </div>
          )}

          {bookingFlow.currentStep === 'confirmation' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Booking Confirmed</h2>
              <p className="text-gray-600">Confirmation component will be implemented in a later task.</p>
              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => navigate('/')}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  New Search
                </button>
                <button
                  onClick={() => navigate('/reservations')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  View Reservations
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Booking Summary Sidebar */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Booking Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Car:</span>
              <span className="font-medium">{bookingFlow.carDetails.displayName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pickup Date:</span>
              <span className="font-medium">{bookingFlow.bookingDetails.startDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Return Date:</span>
              <span className="font-medium">{bookingFlow.bookingDetails.endDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium">{bookingFlow.totalDays} days</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600">Total Cost:</span>
              <span className="font-bold text-lg">${bookingFlow.totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}