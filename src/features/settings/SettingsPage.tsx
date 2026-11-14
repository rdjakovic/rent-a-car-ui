import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSettings, type MileageUnit } from "@/lib/api/queries";
import { SETTINGS_QUERY_KEY, useSettings } from "@/hooks/useSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";

const MILEAGE_UNIT_OPTIONS: { value: MileageUnit; label: string }[] = [
  { value: "KILOMETERS", label: "Kilometers (km)" },
  { value: "MILES", label: "Miles (mi)" },
];

/**
 * Application settings. Changing them requires the ADMIN role on the real security chain
 * (the backend enforces it); local and docker profiles allow everyone.
 */
export default function SettingsPage() {
  const queryClient = useQueryClient();
  const settings = useSettings();
  const [mileageUnit, setMileageUnit] = useState<MileageUnit | undefined>();

  // Start from the saved value once it's loaded
  useEffect(() => {
    if (settings.data?.mileageUnit) setMileageUnit(settings.data.mileageUnit);
  }, [settings.data?.mileageUnit]);

  const save = useMutation({
    mutationFn: (unit: MileageUnit) => updateSettings({ mileageUnit: unit }),
    onSuccess: (saved) => {
      queryClient.setQueryData(SETTINGS_QUERY_KEY, saved);
      toast({ title: "Settings saved" });
    },
    onError: (error: any) => toast({
      title: "Save failed",
      description: error?.status === 403
        ? "Only administrators can change settings."
        : error?.detail ?? error?.message ?? "Unknown error",
      variant: "destructive" as any,
    }),
  });

  const changed = !!mileageUnit && mileageUnit !== settings.data?.mileageUnit;

  return (
    <div className="container mx-auto py-6 px-4 grid gap-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-charcoal">Settings</h1>
        <p className="text-muted-foreground">Application-wide settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Units</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {settings.isLoading ? (
            <Skeleton className="h-16 w-64" />
          ) : settings.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not load settings</AlertTitle>
              <AlertDescription>Please try again later.</AlertDescription>
            </Alert>
          ) : (
            <>
              <fieldset className="grid gap-2">
                <legend className="text-sm font-medium mb-2">Mileage unit</legend>
                <p className="text-sm text-muted-foreground mb-2">
                  The unit the fleet's mileage is recorded in. Values are shown as stored, not converted.
                </p>
                <RadioGroup
                  value={mileageUnit ?? ""}
                  onValueChange={(value) => setMileageUnit(value as MileageUnit)}
                  aria-label="Mileage unit"
                >
                  {MILEAGE_UNIT_OPTIONS.map((option) => (
                    <div key={option.value} className="flex items-center gap-2">
                      <RadioGroupItem id={`mileage-${option.value}`} value={option.value} />
                      <label htmlFor={`mileage-${option.value}`} className="text-sm">{option.label}</label>
                    </div>
                  ))}
                </RadioGroup>
              </fieldset>

              <div>
                <Button
                  onClick={() => mileageUnit && save.mutate(mileageUnit)}
                  disabled={!changed || save.isPending}
                >
                  {save.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
