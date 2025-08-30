import { Link } from "react-router-dom";

export default function ReservationsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Reservations</h1>
        <Link
          to="/book"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          New Booking
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-gray-600">
          Reservations management functionality will be implemented in later tasks.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          This includes reservation listing, search, filtering, and status management.
        </p>
      </div>
    </div>
  );
}