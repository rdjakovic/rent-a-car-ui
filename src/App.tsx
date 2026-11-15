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
import UsersPage from '@/features/users/UsersPage'
import LoginPage from '@/features/auth/LoginPage'
import RequireAuth from '@/features/auth/RequireAuth'
import RequirePermission from '@/features/auth/RequirePermission'
import ChangePasswordPage from '@/features/auth/ChangePasswordPage'
import { useSessionLifecycle } from '@/features/auth/useSessionLifecycle'
import { useAuthStore } from '@/lib/auth/authStore'

export default function App() {
  const signedIn = useAuthStore((state) => state.status === 'authenticated')
  useSessionLifecycle()

  return (
    <div className="min-h-screen text-charcoal">
      {signedIn && <NavigationBar />}
      <main>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
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
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route element={<RequirePermission permission="USER_VIEW" />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>
        </Routes>
      </main>
      <Toaster />
    </div>
  )
}
