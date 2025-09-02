import { Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import NavigationBar from '@/components/NavigationBar'
import BranchesPage from '@/features/branches/BranchesPage'
import AvailabilityPage from '@/features/availability/AvailabilityPage'
import CarsPage from '@/features/cars/CarsPage'
import CarDetailsPage from '@/features/cars/CarDetailsPage'
import CustomersPage from '@/features/customers/CustomersPage'
import ReservationsPage from '@/features/reservations/ReservationsPage'
import BookingWizard from '@/features/reservations/BookingFlow/BookingWizard'

export default function App() {
  return (
    <div className="min-h-screen text-charcoal">
      <NavigationBar />
      <main>
        <Routes>
          <Route path="/" element={<AvailabilityPage />} />
          <Route path="/branches" element={<BranchesPage />} />
          <Route path="/cars" element={<CarsPage />} />
          <Route path="/cars/:id" element={<CarDetailsPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route path="/reservations/:id" element={<div>Reservation Details</div>} />
          <Route path="/book" element={<BookingWizard />} />
          <Route path="/maintenance" element={<div>Maintenance</div>} />
        </Routes>
      </main>
      <Toaster />
    </div>
  )
}
