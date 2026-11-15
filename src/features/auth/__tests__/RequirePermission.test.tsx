import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import RequirePermission from '../RequirePermission'
import { signInAs } from '@/test/authUsers'

function renderGuard() {
  render(
    <MemoryRouter initialEntries={['/users']}>
      <Routes>
        <Route element={<RequirePermission permission="USER_VIEW" />}>
          <Route path="/users" element={<div>users page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('RequirePermission', () => {
  it('shows the page to a user who holds the permission', () => {
    signInAs('MANAGER')
    renderGuard()

    expect(screen.getByText('users page')).toBeInTheDocument()
  })

  it('shows the page to an administrator', () => {
    signInAs('ADMIN')
    renderGuard()

    expect(screen.getByText('users page')).toBeInTheDocument()
  })

  it('explains to staff that the page is not for them', () => {
    signInAs('STAFF')
    renderGuard()

    expect(screen.queryByText('users page')).not.toBeInTheDocument()
    expect(screen.getByText("You don't have access to this page")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to availability' })).toHaveAttribute('href', '/')
  })

  it('keeps a visitor without a session out too', () => {
    renderGuard()

    expect(screen.queryByText('users page')).not.toBeInTheDocument()
    expect(screen.getByText("You don't have access to this page")).toBeInTheDocument()
  })
})
