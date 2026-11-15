import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listBranches, updateSettings, type MileageUnit, type SettingsRequestDto } from "@/lib/api/queries";
import { SETTINGS_QUERY_KEY, useSettings } from "@/hooks/useSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { errorMessage } from "@/lib/api/errors";
import { useCan } from "@/lib/auth/authStore";

const MILEAGE_UNIT_OPTIONS: { value: MileageUnit; label: string }[] = [
  { value: "KILOMETERS", label: "Kilometers (km)" },
  { value: "MILES", label: "Miles (mi)" },
];

// Radix Select can't hold an empty value, so "no default branch" has its own
const NO_BRANCH = "none";

/**
 * Application settings. Changing them requires the ADMIN role on the real security chain
 * (the backend enforces it); local and docker profiles allow everyone.
 */
export default function SettingsPage() {
  const queryClient = useQueryClient();
  const canSave = useCan()("SETTINGS_MANAGE");
  const settings = useSettings();
  const [mileageUnit, setMileageUnit] = useState<MileageUnit | undefined>();
  const [defaultBranch, setDefaultBranch] = useState<string | undefined>();

  const branches = useQuery({
    queryKey: ["branches", "for-select"],
    queryFn: () => listBranches({ page: 0, size: 100 }),
    staleTime: 60_000,
  });

  // Start from the saved values once they're loaded
  useEffect(() => {
    if (settings.data?.mileageUnit) setMileageUnit(settings.data.mileageUnit);
  }, [settings.data?.mileageUnit]);
  useEffect(() => {
    if (settings.data) setDefaultBranch(settings.data.defaultBranchId ? String(settings.data.defaultBranchId) : NO_BRANCH);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: (request: SettingsRequestDto) => updateSettings(request),
    onSuccess: (saved) => {
      queryClient.setQueryData(SETTINGS_QUERY_KEY, saved);
      toast({ title: "Settings saved" });
    },
    onError: (error: any) => toast({
      title: "Save failed",
      description: error?.status === 403
        ? "Only administrators can change settings."
        : errorMessage(error),
      variant: "destructive" as any,
    }),
  });

  const savedBranch = settings.data?.defaultBranchId ? String(settings.data.defaultBranchId) : NO_BRANCH;
  const changed = (!!mileageUnit && mileageUnit !== settings.data?.mileageUnit)
    || (!!defaultBranch && defaultBranch !== savedBranch);

  const onSave = () => {
    if (!mileageUnit || !defaultBranch) return;
    // Leaving the branch out clears the default
    save.mutate({ mileageUnit, defaultBranchId: defaultBranch === NO_BRANCH ? undefined : Number(defaultBranch) });
  };

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
                  disabled={!canSave}
                >
                  {MILEAGE_UNIT_OPTIONS.map((option) => (
                    <div key={option.value} className="flex items-center gap-2">
                      <RadioGroupItem id={`mileage-${option.value}`} value={option.value} />
                      <label htmlFor={`mileage-${option.value}`} className="text-sm">{option.label}</label>
                    </div>
                  ))}
                </RadioGroup>
              </fieldset>

            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Availability search</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {settings.isLoading ? (
            <Skeleton className="h-10 w-64" />
          ) : settings.isError ? null : (
            <div className="grid gap-2 max-w-sm">
              <label htmlFor="default-branch" className="text-sm font-medium">Default branch</label>
              <p className="text-sm text-muted-foreground">
                Pre-selected on the Availability page. Only open branches can be chosen.
              </p>
              <Select value={defaultBranch ?? NO_BRANCH} onValueChange={setDefaultBranch} disabled={!canSave}>
                <SelectTrigger id="default-branch">
                  <SelectValue placeholder={branches.isPending ? "Loading..." : "No default branch"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_BRANCH}>No default branch</SelectItem>
                  {(branches.data?.content ?? []).filter((b) => b.active).map((b) => (
                    <SelectItem key={b.id} value={String(b.id!)}>
                      {b.name} ({b.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {branches.isError && (
                <p className="text-sm text-destructive">Could not load the branches.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!settings.isLoading && !settings.isError && (
        canSave ? (
          <div>
            <Button onClick={onSave} disabled={!changed || save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Only administrators can change settings.</p>
        )
      )}
    </div>
  );
}
