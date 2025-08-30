import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import BookingBreadcrumbs from '../BookingBreadcrumbs'

describe('BookingBreadcrumbs', () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    )
  }

  it('renders breadcrumb navigation with home link', () => {
    renderWithRouter(
      <BookingBreadcrumbs currentStep="customer" />
    )

    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /go to availability search/i })).toBeInTheDocument()
    expect(screen.getByText('Availability')).toBeInTheDocument()
  })

  it('displays current step for customer selection', () => {
    renderWithRouter(
      <BookingBreadcrumbs currentStep="customer" carDisplayName="Toyota Camry" />
    )

    expect(screen.getByText('Book - Toyota Camry')).toBeInTheDocument()
    expect(screen.getByText('Step 1: Customer Selection')).toBeInTheDocument()
  })

  it('displays current step for review', () => {
    renderWithRouter(
      <BookingBreadcrumbs currentStep="review" carDisplayName="Honda Civic" />
    )

    expect(screen.getByText('Book - Honda Civic')).toBeInTheDocument()
    expect(screen.getByText('Step 2: Review & Confirm')).toBeInTheDocument()
  })

  it('displays current step for confirmation', () => {
    renderWithRouter(
      <BookingBreadcrumbs currentStep="confirmation" carDisplayName="BMW X5" />
    )

    expect(screen.getByText('Book - BMW X5')).toBeInTheDocument()
    expect(screen.getByText('Step 3: Confirmation')).toBeInTheDocument()
  })

  it('displays booking without car name when not provided', () => {
    renderWithRouter(
      <BookingBreadcrumbs currentStep="customer" />
    )

    expect(screen.getByText('Book')).toBeInTheDocument()
    expect(screen.queryByText('Book -')).not.toBeInTheDocument()
  })

  it('has correct link to availability page', () => {
    renderWithRouter(
      <BookingBreadcrumbs currentStep="customer" />
    )

    const homeLink = screen.getByRole('link', { name: /go to availability search/i })
    expect(homeLink).toHaveAttribute('href', '/')
  })

  it('displays home icon in breadcrumb', () => {
    renderWithRouter(
      <BookingBreadcrumbs currentStep="customer" />
    )

    // Check that the home icon is present (Lucide React Home component)
    const homeIcon = screen.getByRole('link', { name: /go to availability search/i }).querySelector('svg')
    expect(homeIcon).toBeInTheDocument()
  })

  it('displays chevron separators between breadcrumb items', () => {
    renderWithRouter(
      <BookingBreadcrumbs currentStep="customer" carDisplayName="Toyota Camry" />
    )

    // Check for chevron icons (should be 2: one after Availability, one after Book)
    // Look for SVG elements that are likely chevrons based on their class or content
    const navigation = screen.getByRole('navigation')
    const svgElements = navigation.querySelectorAll('svg')
    
    // Filter for chevron icons (they should have specific classes or paths)
    const chevrons = Array.from(svgElements).filter(svg => 
      svg.classList.contains('lucide-chevron-right') || 
      svg.querySelector('path[d*="6 9"]') // ChevronRight path starts with "m6 9"
    )
    
    expect(chevrons.length).toBeGreaterThanOrEqual(2)
  })

  it('handles long car names gracefully', () => {
    const longCarName = 'Mercedes-Benz S-Class AMG 63 4MATIC+ Premium Plus Package'
    
    renderWithRouter(
      <BookingBreadcrumbs currentStep="review" carDisplayName={longCarName} />
    )

    expect(screen.getByText(`Book - ${longCarName}`)).toBeInTheDocument()
    expect(screen.getByText('Step 2: Review & Confirm')).toBeInTheDocument()
  })

  it('handles special characters in car names', () => {
    const carNameWithSpecialChars = 'BMW X5 M-Sport & Luxury Edition'
    
    renderWithRouter(
      <BookingBreadcrumbs currentStep="confirmation" carDisplayName={carNameWithSpecialChars} />
    )

    expect(screen.getByText(`Book - ${carNameWithSpecialChars}`)).toBeInTheDocument()
    expect(screen.getByText('Step 3: Confirmation')).toBeInTheDocument()
  })

  it('applies correct CSS classes for styling', () => {
    renderWithRouter(
      <BookingBreadcrumbs currentStep="customer" carDisplayName="Toyota Camry" />
    )

    const nav = screen.getByRole('navigation')
    expect(nav).toHaveClass('flex', 'items-center', 'space-x-2', 'text-sm', 'text-gray-600', 'mb-6')

    const homeLink = screen.getByRole('link', { name: /go to availability search/i })
    expect(homeLink).toHaveClass('flex', 'items-center', 'hover:text-gray-900', 'transition-colors')
  })
})