import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import NavigationBar, { NAV_ITEMS } from '../NavigationBar'
import { setSignedIn, useAuthStore } from '@/lib/auth/authStore'

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

  describe('signed in', () => {
    const user = {
      id: 3, username: 'maria.manager', firstName: 'Maria', lastName: 'Manager', roles: ['MANAGER'],
      branchName: 'Downtown Branch', permissions: ['CAR_MANAGE'],
    }

    it('shows nothing about an account when nobody is signed in', () => {
      renderAt()

      expect(screen.queryByRole('button', { name: /Account menu/ })).not.toBeInTheDocument()
    })

    it('shows who is signed in, with role and branch, in the account menu', async () => {
      setSignedIn('token', user)
      renderAt()

      await userEvent.setup().click(screen.getByRole('button', { name: 'Account menu for Maria Manager' }))

      expect(await screen.findByText('Maria Manager')).toBeInTheDocument()
      expect(screen.getByText('Manager · Downtown Branch')).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'Log out' })).toBeInTheDocument()
    })

    it('has name, role and Log out in the hamburger menu, and Log out signs out', async () => {
      setSignedIn('token', user)
      renderAt()

      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
      const mobile = screen.getByRole('navigation', { name: 'Mobile' })
      expect(within(mobile).getByText('Maria Manager')).toBeInTheDocument()
      expect(within(mobile).getByText('Manager · Downtown Branch')).toBeInTheDocument()

      await userEvent.setup().click(within(mobile).getByRole('button', { name: 'Log out' }))

      await waitFor(() => expect(useAuthStore.getState().status).toBe('anonymous'))
    })
  })
})
