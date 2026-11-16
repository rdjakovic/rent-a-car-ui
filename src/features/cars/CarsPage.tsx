import { useState, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { carImageUrl, listCars, type CarFilterParams } from "@/lib/api/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Car, Users, Fuel, Plus } from "lucide-react";
import { NextBooking } from "./NextBooking";
import AddCarDialog from "./AddCarDialog";
import { useCarsFilters, useFilterField } from "@/stores/filterStore";
import { useResetPageOnChange } from "@/hooks/useResetPageOnChange";
import { useCan } from "@/lib/auth/authStore";

const CATEGORIES = ["ECONOMY","COMPACT","INTERMEDIATE","STANDARD","FULL_SIZE","PREMIUM","LUXURY","SUV","VAN"] as const;
const TRANSMISSIONS = ["MANUAL","AUTOMATIC","CVT"] as const;
const FUEL_TYPES = ["GASOLINE","DIESEL","HYBRID","ELECTRIC"] as const;

export default function CarsPage() {
  const can = useCan();
  const canAddCar = can("CAR_MANAGE");
  const [showAddDialog, setShowAddDialog] = useState(false);
  // Filter state
  // Kept while you move between pages
  const [search, setSearch] = useFilterField(useCarsFilters, "search");
  const [make, setMake] = useFilterField(useCarsFilters, "make");
  const [model, setModel] = useFilterField(useCarsFilters, "model");
  const [year, setYear] = useFilterField(useCarsFilters, "year");
  const [vin, setVin] = useFilterField(useCarsFilters, "vin");
  const [category, setCategory] = useFilterField(useCarsFilters, "category");
  const [transmission, setTransmission] = useFilterField(useCarsFilters, "transmission");
  const [fuelType, setFuelType] = useFilterField(useCarsFilters, "fuelType");
  const [minSeats, setMinSeats] = useFilterField(useCarsFilters, "minSeats");
  const [maxPrice, setMaxPrice] = useFilterField(useCarsFilters, "maxPrice");
  const [page, setPage] = useFilterField(useCarsFilters, "page");
  const [size] = useState(12); // Show 12 cars per page for a nice grid

  // The backend matches the year and the VIN exactly, so they are only applied once complete
  const yearValid = /^\d{4}$/.test(year.trim());
  const vinValue = vin.trim().toUpperCase();
  const vinComplete = vinValue.length === 17;

  // Build filter params
  const filterParams: CarFilterParams = useMemo(() => {
    const params: CarFilterParams = { page, size };
    if (search.trim()) params.search = search.trim();
    if (make.trim()) params.make = make.trim();
    if (model.trim()) params.model = model.trim();
    if (yearValid) params.year = Number(year);
    if (vinComplete) params.vin = vinValue;
    if (category) params.category = category as any;
    if (transmission) params.transmission = transmission as any;
    if (fuelType) params.fuelType = fuelType as any;
    if (minSeats) params.minSeats = Number(minSeats);
    if (maxPrice) params.maxPrice = Number(maxPrice);
    return params;
  }, [search, make, model, year, yearValid, vinValue, vinComplete, category, transmission, fuelType, minSeats, maxPrice, page, size]);

  // Reset page when filters change
  useResetPageOnChange([search, make, model, yearValid ? year : "", vinComplete ? vinValue : "", category, transmission, fuelType, minSeats, maxPrice], setPage);

  const carsQuery = useQuery({
    queryKey: ["cars", filterParams],
    queryFn: () => listCars(filterParams),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const isLoading = carsQuery.isLoading || (carsQuery.isFetching && !carsQuery.data);
  const cars = carsQuery.data?.content ?? [];
  const current = carsQuery.data?.number ?? page;
  const totalPages = carsQuery.data?.totalPages ?? 0;
  const hasPrev = current > 0;
  const hasNext = totalPages ? current < totalPages - 1 : false;

  const clearFilters = () => {
    setSearch("");
    setMake("");
    setModel("");
    setYear("");
    setVin("");
    setCategory("");
    setTransmission("");
    setFuelType("");
    setMinSeats("");
    setMaxPrice("");
    setPage(0);
  };

  const hasActiveFilters = search || make || model || year || vin || category || transmission || fuelType || minSeats || maxPrice;

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="grid grid-cols-1 gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-charcoal">Car Catalog</h1>
            <p className="text-muted-foreground">Browse our complete fleet of vehicles</p>
          </div>
          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Clear All Filters
              </Button>
            )}
            {canAddCar && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Add car
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium mb-1">Search</label>
                <SearchInput
                  placeholder="Car name, make, model..."
                  value={search}
                  onChange={setSearch}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c.replaceAll("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Transmission */}
              <div>
                <label className="block text-sm font-medium mb-1">Transmission</label>
                <Select value={transmission} onValueChange={setTransmission}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSMISSIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fuel Type */}
              <div>
                <label className="block text-sm font-medium mb-1">Fuel Type</label>
                <Select value={fuelType} onValueChange={setFuelType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Min Seats */}
              <div>
                <label className="block text-sm font-medium mb-1">Min Seats</label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Any"
                  value={minSeats}
                  onChange={(e) => setMinSeats(e.target.value)}
                />
              </div>

              {/* Max Price */}
              <div>
                <label className="block text-sm font-medium mb-1">Max Daily Price</label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Any"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>

              {/* Make */}
              <div>
                <label className="block text-sm font-medium mb-1">Make</label>
                <SearchInput placeholder="e.g. Toyota" value={make} onChange={setMake} />
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <SearchInput placeholder="e.g. Camry" value={model} onChange={setModel} />
              </div>

              {/* Year */}
              <div>
                <label htmlFor="car-year" className="block text-sm font-medium mb-1">Year</label>
                <Input
                  id="car-year"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="e.g. 2023"
                  value={year}
                  onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))}
                />
              </div>

              {/* VIN */}
              <div>
                <label htmlFor="car-vin" className="block text-sm font-medium mb-1">VIN</label>
                <Input
                  id="car-vin"
                  maxLength={17}
                  autoComplete="off"
                  placeholder="Full 17-character VIN"
                  value={vin}
                  onChange={(e) => setVin(e.target.value.toUpperCase())}
                />
                {vin.trim() !== "" && !vinComplete && (
                  <p className="text-xs text-muted-foreground mt-1">Enter all 17 characters to search by VIN</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {carsQuery.isError ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-destructive">
                <p>Failed to load cars: {(carsQuery.error as any)?.message ?? "Unknown error"}</p>
                <Button
                  variant="outline"
                  onClick={() => carsQuery.refetch()}
                  className="mt-4"
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {isLoading ? (
                  "Loading cars..."
                ) : (
                  `Showing ${cars.length} cars (Page ${current + 1} of ${Math.max(totalPages, 1)})`
                )}
              </p>
            </div>

            {/* Car Cards Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: size }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-40 w-full mb-4" />
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : cars.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Car className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No cars found</p>
                    <p className="text-muted-foreground mb-4">
                      Try adjusting your search criteria or clearing the filters.
                    </p>
                    {hasActiveFilters && (
                      <Button variant="outline" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {cars.map((car) => (
                  <Card key={car.id} className="group hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      {/* One cover photo; the details page shows the rest */}
                      {car.images?.[0] ? (
                        <img
                          src={carImageUrl(car.images[0].url)}
                          alt={car.displayName ?? "Car"}
                          loading="lazy"
                          className="h-40 w-full rounded-lg mb-4 object-cover"
                        />
                      ) : (
                        <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-4 flex items-center justify-center">
                          <Car className="h-16 w-16 text-gray-400" />
                        </div>
                      )}

                      {/* Car Info */}
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg leading-tight">{car.displayName}</h3>
                          <p className="text-sm text-muted-foreground">{car.branchName}</p>
                        </div>

                        {/* Car Details */}
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{car.category}</Badge>
                          <Badge variant="outline">{car.status}</Badge>
                        </div>
                        <NextBooking next={car.nextReservation} />

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{car.seats} seats</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Fuel className="h-3 w-3" />
                            <span>{car.fuelType}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Transmission:</span>
                            <span className="ml-1">{car.transmission}</span>
                          </div>
                        </div>

                        {/* Price and Actions */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div>
                            <span className="text-2xl font-bold text-brand-navy">
                              ${car.dailyPrice?.toFixed?.(2) ?? car.dailyPrice}
                            </span>
                            <span className="text-sm text-muted-foreground">/day</span>
                          </div>
                          <Button asChild className="bg-brand-emerald hover:bg-brand-emerald/90 text-white">
                            <Link to={`/cars/${car.id}`}>View Details</Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={!hasPrev || carsQuery.isFetching}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Page {current + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasNext || carsQuery.isFetching}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {canAddCar && <AddCarDialog open={showAddDialog} onOpenChange={setShowAddDialog} />}
    </div>
  );
}
