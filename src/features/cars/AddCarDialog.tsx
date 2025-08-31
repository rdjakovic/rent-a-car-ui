import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCar, listBranches, type CarRequestDto } from "@/lib/api/queries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus } from "lucide-react";

const CATEGORIES = ["ECONOMY", "COMPACT", "INTERMEDIATE", "STANDARD", "FULL_SIZE", "PREMIUM", "LUXURY", "SUV", "VAN"] as const;
const TRANSMISSIONS = ["MANUAL", "AUTOMATIC", "CVT"] as const;
const FUEL_TYPES = ["GASOLINE", "DIESEL", "HYBRID", "ELECTRIC"] as const;
const STATUSES = ["AVAILABLE", "RENTED", "MAINTENANCE", "OUT_OF_SERVICE"] as const;

interface AddCarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddCarDialog({ open, onOpenChange }: AddCarDialogProps) {
  const queryClient = useQueryClient();
  
  // Form state
  const [formData, setFormData] = useState<Partial<CarRequestDto>>({
    status: "AVAILABLE",
    category: "ECONOMY",
    transmission: "AUTOMATIC",
    fuelType: "GASOLINE",
    seats: 5,
  });

  // Fetch branches for the dropdown
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: () => listBranches({ size: 100 }),
    enabled: open,
  });

  const createCarMutation = useMutation({
    mutationFn: createCar,
    onSuccess: () => {
      // Invalidate and refetch cars list
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      // Reset form and close dialog
      setFormData({
        status: "AVAILABLE",
        category: "ECONOMY",
        transmission: "AUTOMATIC",
        fuelType: "GASOLINE",
        seats: 5,
      });
      onOpenChange(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.vin || !formData.make || !formData.model || !formData.year || 
        !formData.dailyPrice || !formData.branchId) {
      return;
    }

    createCarMutation.mutate(formData as CarRequestDto);
  };

  const updateField = (field: keyof CarRequestDto, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const branches = branchesQuery.data?.content ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Car
          </DialogTitle>
          <DialogDescription>
            Add a new vehicle to the fleet. All required fields must be filled.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* VIN */}
            <div className="md:col-span-2">
              <Label htmlFor="vin">VIN (Vehicle Identification Number) *</Label>
              <Input
                id="vin"
                value={formData.vin || ""}
                onChange={(e) => updateField("vin", e.target.value)}
                placeholder="17-character VIN"
                maxLength={17}
                required
              />
            </div>

            {/* Make */}
            <div>
              <Label htmlFor="make">Make *</Label>
              <Input
                id="make"
                value={formData.make || ""}
                onChange={(e) => updateField("make", e.target.value)}
                placeholder="e.g. Toyota, Honda, BMW"
                required
              />
            </div>

            {/* Model */}
            <div>
              <Label htmlFor="model">Model *</Label>
              <Input
                id="model"
                value={formData.model || ""}
                onChange={(e) => updateField("model", e.target.value)}
                placeholder="e.g. Camry, Civic, X3"
                required
              />
            </div>

            {/* Year */}
            <div>
              <Label htmlFor="year">Year *</Label>
              <Input
                id="year"
                type="number"
                value={formData.year || ""}
                onChange={(e) => updateField("year", Number(e.target.value))}
                placeholder="e.g. 2023"
                min={1900}
                max={new Date().getFullYear() + 1}
                required
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => updateField("category", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transmission */}
            <div>
              <Label htmlFor="transmission">Transmission *</Label>
              <Select value={formData.transmission} onValueChange={(value) => updateField("transmission", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select transmission" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSMISSIONS.map((transmission) => (
                    <SelectItem key={transmission} value={transmission}>
                      {transmission}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fuel Type */}
            <div>
              <Label htmlFor="fuelType">Fuel Type *</Label>
              <Select value={formData.fuelType} onValueChange={(value) => updateField("fuelType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fuel type" />
                </SelectTrigger>
                <SelectContent>
                  {FUEL_TYPES.map((fuelType) => (
                    <SelectItem key={fuelType} value={fuelType}>
                      {fuelType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seats */}
            <div>
              <Label htmlFor="seats">Seats *</Label>
              <Input
                id="seats"
                type="number"
                value={formData.seats || ""}
                onChange={(e) => updateField("seats", Number(e.target.value))}
                placeholder="Number of seats"
                min={1}
                max={50}
                required
              />
            </div>

            {/* Daily Price */}
            <div>
              <Label htmlFor="dailyPrice">Daily Price ($) *</Label>
              <Input
                id="dailyPrice"
                type="number"
                step="0.01"
                value={formData.dailyPrice || ""}
                onChange={(e) => updateField("dailyPrice", Number(e.target.value))}
                placeholder="Daily rental price"
                min={0}
                required
              />
            </div>

            {/* Branch */}
            <div>
              <Label htmlFor="branchId">Branch *</Label>
              <Select value={formData.branchId?.toString()} onValueChange={(value) => updateField("branchId", Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id!.toString()}>
                      {branch.name} - {branch.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => updateField("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mileage */}
            <div>
              <Label htmlFor="mileage">Mileage</Label>
              <Input
                id="mileage"
                type="number"
                value={formData.mileage || ""}
                onChange={(e) => updateField("mileage", Number(e.target.value))}
                placeholder="Current mileage"
                min={0}
              />
            </div>

            {/* Color */}
            <div>
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                value={formData.color || ""}
                onChange={(e) => updateField("color", e.target.value)}
                placeholder="Vehicle color"
              />
            </div>

            {/* License Plate */}
            <div>
              <Label htmlFor="licensePlate">License Plate</Label>
              <Input
                id="licensePlate"
                value={formData.licensePlate || ""}
                onChange={(e) => updateField("licensePlate", e.target.value)}
                placeholder="License plate number"
              />
            </div>

            {/* Insurance Policy */}
            <div className="md:col-span-2">
              <Label htmlFor="insurancePolicy">Insurance Policy</Label>
              <Textarea
                id="insurancePolicy"
                value={formData.insurancePolicy || ""}
                onChange={(e) => updateField("insurancePolicy", e.target.value)}
                placeholder="Insurance policy details"
                rows={3}
              />
            </div>
          </div>

          {createCarMutation.isError && (
            <div className="text-sm text-destructive">
              Failed to create car: {(createCarMutation.error as any)?.message ?? "Unknown error"}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createCarMutation.isPending}
              className="bg-brand-emerald hover:bg-brand-emerald/90 text-white"
            >
              {createCarMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Car
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}