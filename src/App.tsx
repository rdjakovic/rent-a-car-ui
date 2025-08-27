import { NavLink, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import BranchesPage from '@/features/branches/BranchesPage'
import AvailabilityPage from '@/features/availability/AvailabilityPage'

export default function App() {
  return (
    <div className="min-h-dvh bg-brand-light text-brand-charcoal">
      <header className="bg-transparent">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 rounded-2xl bg-brand-navy text-white shadow-lg px-4 py-3">
            <img src="/logo.svg" alt="logo" className="h-8 w-8" />
            <h1 className="text-xl font-semibold">NextStep RentACar</h1>
            <nav className="ml-auto flex gap-6">
              <NavLink className={({isActive}) => `text-white/90 hover:text-white ${isActive ? 'underline underline-offset-4' : ''}`} to="/">Availability</NavLink>
              <NavLink className={({isActive}) => `text-white/90 hover:text-white ${isActive ? 'underline underline-offset-4' : ''}`} to="/branches">Branches</NavLink>
              <NavLink className={({isActive}) => `text-white/90 hover:text-white ${isActive ? 'underline underline-offset-4' : ''}`} to="/cars">Cars</NavLink>
              <NavLink className={({isActive}) => `text-white/90 hover:text-white ${isActive ? 'underline underline-offset-4' : ''}`} to="/customers">Customers</NavLink>
              <NavLink className={({isActive}) => `text-white/90 hover:text-white ${isActive ? 'underline underline-offset-4' : ''}`} to="/reservations">Reservations</NavLink>
              <NavLink className={({isActive}) => `text-white/90 hover:text-white ${isActive ? 'underline underline-offset-4' : ''}`} to="/maintenance">Maintenance</NavLink>
            </nav>
          </div>
        </div>
      </header>
      <main className="container mx-auto py-6 px-4">
        <Routes>
          <Route path="/" element={<AvailabilityPage />} />
          <Route path="/branches" element={<BranchesPage />} />
          <Route path="/cars" element={<div>Cars</div>} />
          <Route path="/customers" element={<div>Customers</div>} />
          <Route path="/reservations" element={<div>Reservations</div>} />
          <Route path="/maintenance" element={<div>Maintenance</div>} />
        </Routes>
      </main>
      <Toaster />
    </div>
  )
}
