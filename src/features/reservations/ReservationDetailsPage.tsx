import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getReservationById, type ReservationResponseDto } from "@/lib/api/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft } from "lucide-react";
import { ReservationDetails } from "./components/ReservationDetails";

/** One reservation with its actions (edit, confirm, pick up, return, cancel); linkable as /reservations/:id. */
export default function ReservationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const reservationId = Number(id);
  const validId = Number.isInteger(reservationId) && reservationId > 0;
  const queryClient = useQueryClient();
  // Under "reservations", so actions that invalidate the reservation lists refresh it too
  const queryKey = ["reservations", "detail", reservationId];

  const reservationQuery = useQuery({
    queryKey,
    queryFn: () => getReservationById(reservationId),
    enabled: validId,
    retry: false,
  });

  const backLink = (
    <Link to="/reservations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-charcoal">
      <ArrowLeft className="h-4 w-4" /> Back to reservations
    </Link>
  );

  if (reservationQuery.isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 grid grid-cols-1 gap-6" aria-busy="true">
        {backLink}
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (reservationQuery.isError || !reservationQuery.data) {
    return (
      <div className="container mx-auto py-6 px-4 grid grid-cols-1 gap-6">
        {backLink}
        <Alert variant="destructive">
          <AlertTitle>Reservation not found</AlertTitle>
          <AlertDescription>
            {validId ? `We couldn't load reservation #${id}.` : "This reservation link is not valid."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 grid grid-cols-1 gap-6">
      {backLink}
      <ReservationDetails
        reservation={reservationQuery.data}
        onUpdate={(updated: ReservationResponseDto) => queryClient.setQueryData(queryKey, updated)}
      />
    </div>
  );
}
