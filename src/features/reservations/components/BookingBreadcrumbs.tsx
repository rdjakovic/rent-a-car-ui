import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";

interface BookingBreadcrumbsProps {
  currentStep: 'customer' | 'review' | 'confirmation';
  carDisplayName?: string;
}

export default function BookingBreadcrumbs({ currentStep, carDisplayName }: BookingBreadcrumbsProps) {
  const steps = [
    { key: 'customer', label: 'Customer Selection', number: 1 },
    { key: 'review', label: 'Review & Confirm', number: 2 },
    { key: 'confirmation', label: 'Confirmation', number: 3 },
  ] as const;

  const currentStepIndex = steps.findIndex(step => step.key === currentStep);

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6" aria-label="Breadcrumb">
      <Link 
        to="/" 
        className="flex items-center hover:text-gray-900 transition-colors"
        aria-label="Go to availability search"
      >
        <Home className="h-4 w-4" />
        <span className="ml-1">Availability</span>
      </Link>
      
      <ChevronRight className="h-4 w-4 text-gray-400" />
      
      <span className="text-gray-900 font-medium">
        Book {carDisplayName ? `- ${carDisplayName}` : ''}
      </span>
      
      {currentStepIndex >= 0 && (
        <>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="text-gray-900 font-medium">
            Step {steps[currentStepIndex].number}: {steps[currentStepIndex].label}
          </span>
        </>
      )}
    </nav>
  );
}