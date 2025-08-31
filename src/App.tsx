import { NavLink, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
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
      <header className="bg-transparent">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 rounded-2xl bg-brand-navy text-white shadow-lg px-4 py-3">
            <NavLink to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <img src="/logo no text small-min.png" alt="logo" className="h-12 w-12" />
              <h1 className="text-2xl font-semibold">NextStep <span className="text-brand-emerald">RentACar</span></h1>
            </NavLink>
            <nav className="ml-auto flex gap-6">
              <NavLink className={({ isActive }) => `text-white/90 hover:text-white hover:bg-brand-orange/90 px-6 py-2 rounded-lg transition-colors ${isActive ? 'underline underline-offset-4 decoration-brand-orange decoration-2' : ''}`} to="/">Availability</NavLink>
              <NavLink className={({ isActive }) => `text-white/90 hover:text-white hover:bg-brand-orange/90 px-6 py-2 rounded-lg transition-colors ${isActive ? 'underline underline-offset-4 decoration-brand-orange decoration-2' : ''}`} to="/branches">Branches</NavLink>
              <NavLink className={({ isActive }) => `text-white/90 hover:text-white hover:bg-brand-orange/90 px-6 py-2 rounded-lg transition-colors ${isActive ? 'underline underline-offset-4 decoration-brand-orange decoration-2' : ''}`} to="/cars">Cars</NavLink>
              <NavLink className={({ isActive }) => `text-white/90 hover:text-white hover:bg-brand-orange/90 px-6 py-2 rounded-lg transition-colors ${isActive ? 'underline underline-offset-4 decoration-brand-orange decoration-2' : ''}`} to="/customers">Customers</NavLink>
              <NavLink className={({ isActive }) => `text-white/90 hover:text-white hover:bg-brand-orange/90 px-6 py-2 rounded-lg transition-colors ${isActive ? 'underline underline-offset-4 decoration-brand-orange decoration-2' : ''}`} to="/reservations">Reservations</NavLink>
              <NavLink className={({ isActive }) => `text-white/90 hover:text-white hover:bg-brand-orange/90 px-6 py-2 rounded-lg transition-colors ${isActive ? 'underline underline-offset-4 decoration-brand-orange decoration-2' : ''}`} to="/maintenance">Maintenance</NavLink>
            </nav>
          </div>
        </div>
      </header>
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
