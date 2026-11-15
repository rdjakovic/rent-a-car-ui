import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import NavigationBar, { NAV_ITEMS } from '../NavigationBar'

function renderAt(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NavigationBar />
      <Routes>
        <Route path="*" element={<div>page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('NavigationBar', () => {
  it('shows the brand and every page link in the main navigation', () => {
    renderAt()

    expect(screen.getByText(/NextStep/)).toBeInTheDocument()
    const main = screen.getByRole('navigation', { name: 'Main' })
    for (const item of NAV_ITEMS) {
      expect(within(main).getByRole('link', { name: item.label })).toHaveAttribute('href', item.to)
    }
    expect(NAV_ITEMS.map((i) => i.label)).toEqual(
      ['Availability', 'Branches', 'Cars', 'Customers', 'Reservations', 'Maintenance', 'Settings'])
  })

  it('opens and closes the menu with the hamburger button', () => {
    renderAt()
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const mobile = screen.getByRole('navigation', { name: 'Mobile' })
    expect(within(mobile).getAllByRole('link')).toHaveLength(NAV_ITEMS.length)
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }))
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).not.toBeInTheDocument()
  })

  it('closes the menu after choosing a page', () => {
    renderAt()

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Mobile' })).getByRole('link', { name: 'Cars' }))

    expect(screen.queryByRole('navigation', { name: 'Mobile' })).not.toBeInTheDocument()
  })

  it('underlines the current page', () => {
    renderAt('/maintenance')

    const main = screen.getByRole('navigation', { name: 'Main' })
    expect(within(main).getByRole('link', { name: 'Maintenance' })).toHaveClass('underline')
    expect(within(main).getByRole('link', { name: 'Cars' })).not.toHaveClass('underline')
  })
})
