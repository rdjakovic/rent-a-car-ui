import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { listCars, type CarFilterParams } from "@/lib/api/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Car, Users, Fuel } from "lucide-react";

const CATEGORIES = ["ECONOMY","COMPACT","INTERMEDIATE","STANDARD","FULL_SIZE","PREMIUM","LUXURY","SUV","VAN"] as const;
const TRANSMISSIONS = ["MANUAL","AUTOMATIC","CVT"] as const;
const FUEL_TYPES = ["GASOLINE","DIESEL","HYBRID","ELECTRIC"] as const;

export default function CarsPage() {
  // Filter state
  const [vin, setVin] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [transmission, setTransmission] = useState<string>("");
  const [fuelType, setFuelType] = useState<string>("");
  const [minSeats, setMinSeats] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [page, setPage] = useState(0);
  const [size] = useState(12); // Show 12 cars per page for a nice grid

  // Build filter params
  const filterParams: CarFilterParams = useMemo(() => {
    const params: CarFilterParams = { page, size };
    if (vin.trim()) params.vin = vin.trim();
    if (make.trim()) params.make = make.trim();
    if (model.trim()) params.model = model.trim();
    if (year) params.year = Number(year);
    if (category) params.category = category as any;
    if (transmission) params.transmission = transmission as any;
    if (fuelType) params.fuelType = fuelType as any;
    if (minSeats) params.minSeats = Number(minSeats);
    if (maxPrice) params.maxPrice = Number(maxPrice);
    return params;
  }, [vin, make, model, year, category, transmission, fuelType, minSeats, maxPrice, page, size]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [vin, make, model, year, category, transmission, fuelType, minSeats, maxPrice]);

  const carsQuery = useQuery({
    queryKey: ["cars", filterParams],
    queryFn: () => listCars(filterParams),
    staleTime: 30_000,
    keepPreviousData: true,
  });

  const isLoading = carsQuery.isLoading || (carsQuery.isFetching && !carsQuery.data);
  const cars = carsQuery.data?.content ?? [];
  const current = carsQuery.data?.number ?? page;
  const totalPages = carsQuery.data?.totalPages ?? 0;
  const hasPrev = current > 0;
  const hasNext = totalPages ? current < totalPages - 1 : false;

  const clearFilters = () => {
    setVin("");
    setMake("");
    setModel("");
    setYear("");
    setCategory("");
    setTransmission("");
    setFuelType("");
    setMinSeats("");
    setMaxPrice("");
    setPage(0);
  };

  const hasActiveFilters = vin || make || model || year || category || transmission || fuelType || minSeats || maxPrice;

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-charcoal">Car Catalog</h1>
            <p className="text-muted-foreground">Browse our complete fleet of vehicles</p>
          </div>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters}>
              Clear All Filters
            </Button>
          )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* VIN */}
              <div>
                <label className="block text-sm font-medium mb-1">VIN</label>
                <Input
                  placeholder="Vehicle identification number"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                />
              </div>

              {/* Make */}
              <div>
                <label className="block text-sm font-medium mb-1">Make</label>
                <Input
                  placeholder="e.g. Toyota, Honda, BMW"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                />
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <Input
                  placeholder="e.g. Camry, Civic, X3"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>

              {/* Year */}
              <div>
                <label className="block text-sm font-medium mb-1">Year</label>
                <Input
                  type="number"
                  min={1900}
                  max={new Date().getFullYear() + 1}
                  placeholder="e.g. 2023"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
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
                      {/* Car Image Placeholder */}
                      <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-4 flex items-center justify-center">
                        <Car className="h-16 w-16 text-gray-400" />
                      </div>

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
                          <Button className="bg-brand-emerald hover:bg-brand-emerald/90 text-white">
                            View Details
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
    </div>
  );
}
