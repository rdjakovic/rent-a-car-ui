import { Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import NavigationBar from '@/components/NavigationBar'
import BranchesPage from '@/features/branches/BranchesPage'
import AvailabilityPage from '@/features/availability/AvailabilityPage'
import CarsPage from '@/features/cars/CarsPage'
import CarDetailsPage from '@/features/cars/CarDetailsPage'
import SettingsPage from '@/features/settings/SettingsPage'
import MaintenancePage from '@/features/maintenance/MaintenancePage'
import MaintenanceDetailsPage from '@/features/maintenance/MaintenanceDetailsPage'
import CustomersPage from '@/features/customers/CustomersPage'
import ReservationsPage from '@/features/reservations/ReservationsPage'
import ReservationDetailsPage from '@/features/reservations/ReservationDetailsPage'
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
          <Route path="/reservations/:id" element={<ReservationDetailsPage />} />
          <Route path="/book" element={<BookingWizard />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/maintenance/:id" element={<MaintenanceDetailsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
      <Toaster />
    </div>
  )
}
