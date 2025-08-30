import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, User, Phone, Mail, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDebounce } from "@/hooks/useDebounce";
import { listCustomers, type CustomerSearchParams, type CustomerResponseDto } from "@/lib/api/queries";
import { useBookingFlowStore } from "@/stores/useBookingFlowStore";
import CustomerFormDialog from "@/features/customers/CustomerFormDialog";
import { 
  validateCustomerForBooking, 
  hasValidDriverLicense, 
  getCustomerValidationError 
} from "../utils/customerValidation";

interface CustomerSelectionProps {
  onNext: () => void;
  onBack?: () => void;
}

export default function CustomerSelection({ onNext, onBack }: CustomerSelectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [page, setPage] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const { customer, setCustomer } = useBookingFlowStore();
  
  // Debounce search term to avoid excessive API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const searchParams: CustomerSearchParams = useMemo(() => ({
    search: debouncedSearchTerm || undefined,
    page,
    size: 10,
  }), [debouncedSearchTerm, page]);

  const {
    data: customersData,
    isLoading,
    isFetching,
    error
  } = useQuery({
    queryKey: ["customers", searchParams],
    queryFn: () => listCustomers(searchParams),
    keepPreviousData: true,
    staleTime: 30_000,
  });

  const customers = customersData?.content ?? [];
  const totalPages = customersData?.totalPages ?? 0;
  const currentPage = customersData?.number ?? page;
  const hasPrev = currentPage > 0;
  const hasNext = totalPages ? currentPage < totalPages - 1 : false;

  const validateCustomer = (selectedCustomer: CustomerResponseDto): string | null => {
    return getCustomerValidationError(selectedCustomer);
  };

  const handleCustomerSelect = (selectedCustomer: CustomerResponseDto) => {
    const error = validateCustomer(selectedCustomer);
    if (error) {
      setValidationError(error);
      return;
    }
    
    setValidationError(null);
    setCustomer(selectedCustomer);
  };

  const handleNext = () => {
    if (!customer) {
      setValidationError("Please select a customer");
      return;
    }
    
    const error = validateCustomer(customer);
    if (error) {
      setValidationError(error);
      return;
    }
    
    setValidationError(null);
    onNext();
  };

  const handleCustomerCreated = () => {
    setShowCreateDialog(false);
    // Refresh the customer list
    setSearchTerm("");
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-charcoal mb-2">Select Customer</h2>
        <p className="text-muted-foreground">
          Search for an existing customer or create a new one for this booking.
        </p>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Customers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search by name, email, phone, or license number..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                className="w-full"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Customer
            </Button>
          </div>
          
          {searchTerm && (
            <p className="text-sm text-muted-foreground">
              Searching for "{searchTerm}"...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Validation Error */}
      {validationError && (
        <Alert variant="destructive">
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {/* Selected Customer */}
      {customer && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <User className="h-5 w-5" />
              Selected Customer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">{customer.fullName || `${customer.firstName} ${customer.lastName}`}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Mail className="h-4 w-4" />
                  {customer.email}
                </div>
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {customer.phone}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="h-4 w-4" />
                  <span className="font-medium">License:</span>
                  {customer.driverLicenseNo}
                </div>
                {customer.licenseExpiryDate && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Expires: {new Date(customer.licenseExpiryDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustomer(null)}
              className="mt-3"
            >
              Change Customer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Customer List */}
      {!customer && (
        <Card>
          <CardHeader>
            <CardTitle>Available Customers</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  Failed to load customers. Please try again.
                </AlertDescription>
              </Alert>
            )}
            
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-9 w-20" />
                  </div>
                ))}
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "No customers found matching your search." : "No customers found."}
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Customer
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {customers.map((customerItem) => {
                  const hasValidLicense = hasValidDriverLicense(customerItem);
                  
                  return (
                    <div
                      key={customerItem.id}
                      className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
                        !hasValidLicense ? 'opacity-60' : 'cursor-pointer'
                      }`}
                      onClick={() => hasValidLicense && handleCustomerSelect(customerItem)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">
                            {customerItem.fullName || `${customerItem.firstName} ${customerItem.lastName}`}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {customerItem.email}
                            </span>
                            {customerItem.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {customerItem.phone}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-1 text-sm">
                              <CreditCard className="h-3 w-3" />
                              {customerItem.driverLicenseNo || "No license"}
                            </span>
                            {!hasValidLicense && customerItem.driverLicenseNo && (
                              <Badge variant="destructive" className="text-xs">
                                License Expired
                              </Badge>
                            )}
                            {!customerItem.driverLicenseNo && (
                              <Badge variant="secondary" className="text-xs">
                                No License
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant={hasValidLicense ? "default" : "secondary"}
                        size="sm"
                        disabled={!hasValidLicense}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasValidLicense) {
                            handleCustomerSelect(customerItem);
                          }
                        }}
                      >
                        {hasValidLicense ? "Select" : "Invalid"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {customers.length > 0 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage + 1} of {Math.max(totalPages, 1)}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={!hasPrev || isFetching}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={!hasNext || isFetching}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={!onBack}
        >
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!customer}
        >
          Continue to Review
        </Button>
      </div>

      {/* Customer Creation Dialog */}
      <CustomerFormDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) {
            handleCustomerCreated();
          }
        }}
      />
    </div>
  );
}