import { NavLink, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import BranchesPage from '@/features/branches/BranchesPage'

export default function App() {
  return (
    <div className="min-h-dvh bg-white text-slate-900">
      <header className="border-b">
        <div className="container mx-auto flex items-center gap-3 py-3">
          <img src="/logo.svg" alt="logo" className="h-8 w-8" />
          <h1 className="text-xl font-semibold text-brand-600">NextStep RentACar</h1>
          <nav className="ml-auto flex gap-4">
            <NavLink to="/">Availability</NavLink>
            <NavLink to="/branches">Branches</NavLink>
            <NavLink to="/cars">Cars</NavLink>
            <NavLink to="/customers">Customers</NavLink>
            <NavLink to="/reservations">Reservations</NavLink>
            <NavLink to="/maintenance">Maintenance</NavLink>
          </nav>
        </div>
      </header>
      <main className="container mx-auto py-6">
        <Routes>
          <Route path="/" element={<div>Availability Search</div>} />
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
