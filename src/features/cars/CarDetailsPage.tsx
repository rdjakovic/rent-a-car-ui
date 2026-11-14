import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { findAvailableCars, getCarById, type CarResponseDto } from "@/lib/api/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Car, MapPin } from "lucide-react";

/** Today as yyyy-mm-dd in local time (the date inputs work in local dates). */
function todayString() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b last:border-b-0 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value ?? "—"}</dd>
    </div>
  );
}

export default function CarDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const carId = Number(id);
  const navigate = useNavigate();

  const carQuery = useQuery({
    queryKey: ["car", carId],
    queryFn: () => getCarById(carId),
    enabled: Number.isInteger(carId) && carId > 0,
    retry: false,
  });

  const backLink = (
    <Link to="/cars" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-charcoal">
      <ArrowLeft className="h-4 w-4" /> Back to catalog
    </Link>
  );

  if (carQuery.isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 grid gap-6" aria-busy="true">
        {backLink}
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (carQuery.isError || !carQuery.data) {
    return (
      <div className="container mx-auto py-6 px-4 grid gap-6">
        {backLink}
        <Alert variant="destructive">
          <AlertTitle>Car not found</AlertTitle>
          <AlertDescription>
            {Number.isInteger(carId) && carId > 0
              ? `We couldn't load car #${id}. It may have been removed.`
              : "This car link is not valid."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const car = carQuery.data;

  return (
    <div className="container mx-auto py-6 px-4 grid gap-6">
      {backLink}

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-charcoal">{car.displayName}</h1>
          <p className="text-muted-foreground">{car.branch?.name}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="secondary">{car.category}</Badge>
            <Badge variant="outline">{car.status}</Badge>
          </div>
        </div>
        <div className="text-right">
          <span className="text-3xl font-bold text-brand-navy">${car.dailyPrice?.toFixed(2)}</span>
          <span className="text-sm text-muted-foreground">/day</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <div className="h-56 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
            <Car className="h-24 w-24 text-gray-400" aria-hidden="true" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <dl>
                  <DetailRow label="Make" value={car.make} />
                  <DetailRow label="Model" value={car.model} />
                  <DetailRow label="Year" value={car.year} />
                  <DetailRow label="Transmission" value={car.transmission} />
                  <DetailRow label="Fuel type" value={car.fuelType} />
                  <DetailRow label="Seats" value={car.seats} />
                  <DetailRow label="Color" value={car.color} />
                  <DetailRow label="Mileage" value={car.mileage?.toLocaleString()} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Registration &amp; service</CardTitle>
              </CardHeader>
              <CardContent>
                <dl>
                  <DetailRow label="License plate" value={car.licensePlate} />
                  <DetailRow label="VIN" value={car.vin} />
                  <DetailRow label="Insurance policy" value={car.insurancePolicy} />
                  <DetailRow label="Last service" value={car.lastServiceDate} />
                  <DetailRow label="Next service" value={car.nextServiceDate} />
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-6 content-start">
          <BookingCard car={car} onBook={(params) => navigate(`/book?${params.toString()}`)} />

          {car.branch && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-4 w-4" aria-hidden="true" /> Pickup branch
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{car.branch.name}</p>
                <p>{car.branch.address}</p>
                <p>{[car.branch.city, car.branch.country].filter(Boolean).join(", ")}</p>
                {car.branch.phone && <p>{car.branch.phone}</p>}
                {car.branch.email && <p>{car.branch.email}</p>}
                {car.branch.openingHours && <p className="text-muted-foreground">Hours: {car.branch.openingHours}</p>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Pick dates, confirm this car is free for them (same availability search as the
 * Availability page), then continue into the booking wizard.
 */
function BookingCard({ car, onBook }: { car: CarResponseDto; onBook: (params: URLSearchParams) => void }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [checking, setChecking] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [checkError, setCheckError] = useState("");

  const bookable = car.status === "AVAILABLE" && !!car.branch?.id;

  const dateError = !startDate || !endDate
    ? ""
    : startDate < todayString()
      ? "Pickup date cannot be in the past"
      : endDate < startDate
        ? "Return date cannot be before pickup date"
        : "";

  const resetResult = () => {
    setUnavailable(false);
    setCheckError("");
  };

  const handleBook = async () => {
    if (!car.branch?.id || !car.id) return;
    resetResult();
    setChecking(true);
    try {
      // Narrow the search to this car's attributes so it is on the first page if it's free
      const result = await findAvailableCars({
        branchId: car.branch.id,
        startDate,
        endDate,
        category: car.category,
        transmission: car.transmission,
        fuelType: car.fuelType,
        maxPrice: car.dailyPrice,
        page: 0,
        size: 100,
      });
      const isFree = (result.content ?? []).some((c) => c.id === car.id);
      if (!isFree) {
        setUnavailable(true);
        return;
      }
      onBook(new URLSearchParams({
        carId: String(car.id),
        branchId: String(car.branch.id),
        startDate,
        endDate,
        dailyPrice: String(car.dailyPrice),
        carDisplayName: car.displayName || "Unknown Car",
        carCategory: car.category || "ECONOMY",
        branchName: car.branch.name || "Unknown Branch",
      }));
    } catch (error: any) {
      setCheckError(error?.message ?? "Could not check availability. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Book this car</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {!bookable ? (
          <p className="text-sm text-muted-foreground">
            This car can't be booked right now (status: {car.status}).
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="book-start" className="block text-sm font-medium mb-1">Pickup date</label>
                <Input id="book-start" type="date" min={todayString()} value={startDate}
                       onChange={(e) => { setStartDate(e.target.value); resetResult(); }} />
              </div>
              <div>
                <label htmlFor="book-end" className="block text-sm font-medium mb-1">Return date</label>
                <Input id="book-end" type="date" min={startDate || todayString()} value={endDate}
                       onChange={(e) => { setEndDate(e.target.value); resetResult(); }} />
              </div>
            </div>

            {dateError && (
              <Alert variant="destructive">
                <AlertTitle>Invalid dates</AlertTitle>
                <AlertDescription>{dateError}</AlertDescription>
              </Alert>
            )}
            {unavailable && (
              <Alert variant="destructive">
                <AlertTitle>Not available</AlertTitle>
                <AlertDescription>This car is already booked for these dates. Try other dates.</AlertDescription>
              </Alert>
            )}
            {checkError && (
              <Alert variant="destructive">
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>{checkError}</AlertDescription>
              </Alert>
            )}

            <Button
              className="bg-brand-emerald hover:bg-brand-emerald/90 text-white"
              disabled={!startDate || !endDate || !!dateError || checking}
              onClick={handleBook}
            >
              {checking ? "Checking availability…" : "Book this car"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
