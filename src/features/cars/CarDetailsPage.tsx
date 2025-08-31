import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCarById } from "@/lib/api/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Car, Users, Fuel, Calendar, MapPin, DollarSign } from "lucide-react";

export default function CarDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const carQuery = useQuery({
    queryKey: ["car", id],
    queryFn: () => getCarById(Number(id!)),
    enabled: !!id,
  });

  if (carQuery.isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="grid gap-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full mb-6" />
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (carQuery.isError) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="grid gap-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/cars')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cars
            </Button>
          </div>
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-destructive">
                <Car className="mx-auto h-12 w-12 mb-4" />
                <p className="text-lg font-medium">Car not found</p>
                <p className="text-muted-foreground mb-4">
                  The car you're looking for doesn't exist or has been removed.
                </p>
                <Button variant="outline" onClick={() => navigate('/cars')}>
                  Back to Cars
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const car = carQuery.data;

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/cars')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cars
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-charcoal">{car?.displayName || 'Car Details'}</h1>
            <p className="text-muted-foreground">Complete vehicle information</p>
          </div>
        </div>

        {/* Car Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehicle Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Car Image Placeholder */}
              <div className="h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                <Car className="h-24 w-24 text-gray-400" />
              </div>

              {/* Car Information */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{car?.displayName}</h2>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary">{car?.category}</Badge>
                    <Badge variant="outline">{car?.status}</Badge>
                  </div>
                </div>

                {/* Specifications */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Seats:</span>
                      <span>{car?.seats}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Fuel className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Fuel:</span>
                      <span>{car?.fuelType}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Year:</span>
                      <span>{car?.year}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Make:</span>
                      <p>{car?.make}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Model:</span>
                      <p>{car?.model}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Transmission:</span>
                      <p>{car?.transmission}</p>
                    </div>
                  </div>
                </div>

                {/* Location and Pricing */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Location:</span>
                    <span>{car?.branchName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Daily Rate:</span>
                    <span className="text-2xl font-bold text-brand-navy">
                      ${car?.dailyPrice?.toFixed?.(2) ?? car?.dailyPrice}
                    </span>
                  </div>
                </div>

                {/* VIN Information */}
                {car?.vin && (
                  <div className="pt-4 border-t">
                    <span className="text-sm font-medium text-muted-foreground">VIN:</span>
                    <p className="font-mono text-sm">{car.vin}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    className="bg-brand-emerald hover:bg-brand-emerald/90 text-white flex-1"
                    disabled={car?.status !== 'AVAILABLE'}
                  >
                    {car?.status === 'AVAILABLE' ? 'Book Now' : 'Not Available'}
                  </Button>
                  <Button variant="outline">
                    Contact Branch
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}