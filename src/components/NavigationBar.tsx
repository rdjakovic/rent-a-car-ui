import { useState } from 'react'
import { NavLink } from 'react-router-dom'

export default function NavigationBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="bg-transparent">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between rounded-2xl bg-brand-navy text-white shadow-lg px-4 py-3">
          <NavLink
            to="/"
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          >
            <img src="/logo no text small-min.png" alt="logo" className="h-12 w-12" />
            <h1 className="text-2xl font-semibold">
              NextStep <span className="text-brand-emerald">RentACar</span>
            </h1>
          </NavLink>
          <nav className="hidden lg:flex gap-2 lg:gap-4 xl:gap-6">
            <NavLink
              className={({ isActive }) =>
                `text-white/90 hover:text-white hover:bg-brand-orange/90 px-2 lg:px-4 xl:px-6 py-2 rounded-lg transition-colors text-xs lg:text-sm xl:text-base ${
                  isActive ? 'underline underline-offset-4 decoration-brand-orange decoration-2' : ''
                }`
              }
              to="/"
              onClick={() => setIsMenuOpen(false)}
            >
              Availability
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `text-white/90 hover:text-white hover:bg-brand-orange/90 px-2 lg:px-4 xl:px-6 py-2 rounded-lg transition-colors text-xs lg:text-sm xl:text-base ${
                  isActive ? 'underline underline-offset-4 decoration-brand-orange decoration-2' : ''
                }`
              }
              to="/branches"
              onClick={() => setIsMenuOpen(false)}
            >
              Branches
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `text-white/90 hover:text-white hover:bg-brand-orange/90 px-2 lg:px-4 xl:px-6 py-2 rounded-lg transition-colors text-xs lg:text-sm xl:text-base ${
                  isActive ? 'underline underline-offset-4 decoration-brand-orange decoration-2' : ''
                }`
              }
              to="/cars"
              onClick={() => setIsMenuOpen(false)}
            >
              Cars
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `text-white/90 hover:text-white hover:bg-brand-orange/90 px-2 lg:px-4 xl:px-6 py-2 rounded-lg transition-colors text-xs lg:text-sm xl:text-base ${
                  isActive ? 'underline underline-offset-4 decoration-brand-orange decoration-2' : ''
                }`
              }
              to="/customers"
              onClick={() => setIsMenuOpen(false)}
            >
              Customers
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `text-white/90 hover:text-white hover:bg-brand-orange/90 px-2 lg:px-4 xl:px-6 py-2 rounded-lg transition-colors text-xs lg:text-sm xl:text-base ${
                  isActive ? 'underline underline-offset-4 decoration-brand-orange decoration-2' : ''
                }`
              }
              to="/reservations"
              onClick={() => setIsMenuOpen(false)}
            >
              Reservations
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `text-white/90 hover:text-white hover:bg-brand-orange/90 px-2 lg:px-4 xl:px-6 py-2 rounded-lg transition-colors text-xs lg:text-sm xl:text-base ${
                  isActive ? 'underline underline-offset-4 decoration-brand-orange decoration-2' : ''
                }`
              }
              to="/maintenance"
              onClick={() => setIsMenuOpen(false)}
            >
              Maintenance
            </NavLink>
          </nav>
          <button
            className="lg:hidden text-white text-2xl"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            ☰
          </button>
        </div>
        {isMenuOpen && (
          <div className="lg:hidden bg-brand-navy text-white px-4 py-2 rounded-b-2xl shadow-lg">
            <nav className="flex flex-col gap-2">
              <NavLink
                className={({ isActive }) =>
                  `text-white/90 hover:text-white hover:bg-brand-orange/90 px-4 py-2 rounded-lg transition-colors ${
                    isActive ? 'underline underline-offset-4 decoration-brand-orange decoration-2' : ''
                  }`
                }
                to="/"
                onClick={() => setIsMenuOpen(false)}
              >
                Availability
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  `text-white/90 hover:text-white hover:bg-brand-orange/90 px-4 py-2 rounded-lg transition-colors ${
                    isActive ? 'underline underline-offset-4 decoration-brand-orange decoration-2' : ''
                  }`
                }
                to="/branches"
                onClick={() => setIsMenuOpen(false)}
              >
                Branches
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  `text-white/90 hover:text-white hover:bg-brand-orange/90 px-4 py-2 rounded-lg transition-colors ${
                    isActive ? 'underline underline-offset-4 decoration-brand-orange decoration-2' : ''
                  }`
                }
                to="/cars"
                onClick={() => setIsMenuOpen(false)}
              >
                Cars
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  `text-white/90 hover:text-white hover:bg-brand-orange/90 px-4 py-2 rounded-lg transition-colors ${
                    isActive ? 'underline underline-offset-4 decoration-brand-orange decoration-2' : ''
                  }`
                }
                to="/customers"
                onClick={() => setIsMenuOpen(false)}
              >
                Customers
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  `text-white/90 hover:text-white hover:bg-brand-orange/90 px-4 py-2 rounded-lg transition-colors ${
                    isActive ? 'underline underline-offset-4 decoration-brand-orange decoration-2' : ''
                  }`
                }
                to="/reservations"
                onClick={() => setIsMenuOpen(false)}
              >
                Reservations
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  `text-white/90 hover:text-white hover:bg-brand-orange/90 px-4 py-2 rounded-lg transition-colors ${
                    isActive ? 'underline underline-offset-4 decoration-brand-orange decoration-2' : ''
                  }`
                }
                to="/maintenance"
                onClick={() => setIsMenuOpen(false)}
              >
                Maintenance
              </NavLink>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}