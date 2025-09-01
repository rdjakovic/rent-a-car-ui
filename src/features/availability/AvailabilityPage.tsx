import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listBranches, findAvailableCars, type AvailabilityParams } from "@/lib/api/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = ["ECONOMY","COMPACT","INTERMEDIATE","STANDARD","FULL_SIZE","PREMIUM","LUXURY","SUV","VAN"] as const;
const TRANSMISSIONS = ["MANUAL","AUTOMATIC","CVT"] as const;
const FUEL_TYPES = ["GASOLINE","DIESEL","HYBRID","ELECTRIC"] as const;

export default function AvailabilityPage() {
  const navigate = useNavigate();

  // Form state
  const [branchId, setBranchId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [category, setCategory] = useState<string>("");
  const [transmission, setTransmission] = useState<string>("");
  const [fuelType, setFuelType] = useState<string>("");
  const [minSeats, setMinSeats] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [submitted, setSubmitted] = useState(false);

  // Branch options
  const branchesQuery = useQuery({
    queryKey: ["branches", "for-select"],
    queryFn: () => listBranches({ page: 0, size: 100 }),
    staleTime: 60_000,
  });

  // Derived validation
  const dateError = useMemo(() => {
    if (!startDate || !endDate) return "";
    if (endDate <= startDate) return "End date must be after start date";
    return "";
  }, [startDate, endDate]);

  const enabled = submitted && !!branchId && !!startDate && !!endDate && !dateError;

  const availParams: AvailabilityParams | undefined = enabled
    ? {
        branchId: Number(branchId),
        startDate,
        endDate,
        category: (category || undefined) as any,
        transmission: (transmission || undefined) as any,
        fuelType: (fuelType || undefined) as any,
        minSeats: minSeats ? Number(minSeats) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        page,
        size,
      }
    : undefined;

  useEffect(() => {
    setPage(0); // reset to first page when filters change
  }, [branchId, startDate, endDate, category, transmission, fuelType, minSeats, maxPrice]);

  const availQuery = useQuery({
    queryKey: [
      "available-cars",
      branchId,
      startDate,
      endDate,
      category,
      transmission,
      fuelType,
      minSeats,
      maxPrice,
      page,
      size,
    ],
    queryFn: () => findAvailableCars(availParams as AvailabilityParams),
    enabled: !!availParams,
    keepPreviousData: true,
    staleTime: 10_000,
  });

  const isLoading = availQuery.isLoading || (availQuery.isFetching && !availQuery.data);
  const results = availQuery.data?.content ?? [];
  const current = availQuery.data?.number ?? page;
  const totalPages = availQuery.data?.totalPages ?? 0;
  const hasPrev = current > 0;
  const hasNext = totalPages ? current < totalPages - 1 : false;

  // Handle booking navigation
  const handleBookCar = (car: any) => {
    const bookingParams = new URLSearchParams({
      carId: String(car.id),
      branchId: branchId,
      startDate: startDate,
      endDate: endDate,
      dailyPrice: String(car.dailyPrice),
      carDisplayName: car.displayName || 'Unknown Car',
      carCategory: car.category || 'ECONOMY',
      branchName: car.branchName || 'Unknown Branch',
    });

    navigate(`/book?${bookingParams.toString()}`);
  };

  return (
    <div className="min-h-screen bg-brand-light">
      {/* Hero Section */}
      <section className="bg-brand-light py-2">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-brand-navy to-brand-steel text-white py-12 rounded-2xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              NextStep <span className="text-brand-emerald">RentACar</span>
            </h1>
            <p className="text-lg md:text-xl mb-6 text-brand-silver max-w-xl mx-auto">
              Your journey starts here. Premium car rentals with unmatched service and competitive rates.
            </p>
            <button className="bg-brand-orange hover:bg-brand-orange/90 text-white px-6 py-3 rounded-lg text-base font-semibold transition-colors shadow-lg hover:shadow-xl">
              Rent Now
            </button>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="container mx-auto px-4 py-2">
        <div className="grid gap-6">
          <Card>
        <CardHeader>
          <CardTitle>Availability Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Branch</label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder={branchesQuery.isPending ? "Loading..." : "Select branch"} />
                </SelectTrigger>
                <SelectContent>
                  {(branchesQuery.data?.content ?? []).map((b) => (
                    <SelectItem key={b.id} value={String(b.id!)}>
                      {b.name} ({b.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium mb-1">Start date</label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium mb-1">End date</label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="md:col-span-3 lg:col-span-1" />
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
            <div>
              <label className="block text-sm font-medium mb-1">Fuel type</label>
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
            <div>
              <label className="block text-sm font-medium mb-1">Min seats</label>
              <Input type="number" min={1} value={minSeats} onChange={(e) => setMinSeats(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max daily price</label>
              <Input type="number" min={0} step="0.01" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
            </div>
          </div>

          {dateError && (
            <div className="mt-4">
              <Alert variant="destructive">
                <AlertTitle>Invalid dates</AlertTitle>
                <AlertDescription>{dateError}</AlertDescription>
              </Alert>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <Button onClick={() => setSubmitted(true)} disabled={!branchId || !startDate || !endDate || !!dateError}>
              Search
            </Button>
            <Button variant="outline" onClick={() => { setSubmitted(false); setPage(0); }}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          {!submitted ? (
            <div className="text-sm text-muted-foreground">Enter criteria and click Search.</div>
          ) : isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : availQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Search failed</AlertTitle>
              <AlertDescription>{(availQuery.error as any)?.message ?? "Unknown error"}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Car</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Transmission</TableHead>
                    <TableHead>Fuel</TableHead>
                    <TableHead>Seats</TableHead>
                    <TableHead>Daily Price</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.displayName}</TableCell>
                      <TableCell>{c.category}</TableCell>
                      <TableCell>{c.transmission}</TableCell>
                      <TableCell>{c.fuelType}</TableCell>
                      <TableCell>{c.seats}</TableCell>
                      <TableCell>${" "}{c.dailyPrice?.toFixed?.(2) ?? c.dailyPrice}</TableCell>
                      <TableCell>{c.branchName}</TableCell>
                      <TableCell>{c.color}</TableCell>
                      <TableCell>
                        <Badge>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          className="bg-brand-emerald text-white hover:brightness-95"
                          onClick={() => handleBookCar(c)}
                        >
                          Book
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {results.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                        No cars available for selected dates.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Page {current + 1} of {Math.max(totalPages, 1)}</div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={!hasPrev || availQuery.isFetching}>
                    Previous
                  </Button>
                  <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={!hasNext || availQuery.isFetching}>
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      </section>
    </div>
  );
}
