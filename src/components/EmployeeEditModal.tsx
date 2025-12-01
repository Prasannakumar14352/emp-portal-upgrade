import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { userService, type UserProfile } from "@/services/userService";
import { toast } from "sonner";
import { MapPin, Loader2 } from "lucide-react";
import LocationPicker from "./LocationPicker";

interface EmployeeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  onSuccess: () => void;
}

export function EmployeeEditModal({
  isOpen,
  onClose,
  employeeId,
  onSuccess,
}: EmployeeEditModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    department: "",
    position: "",
    hire_date: "",
  });

  const [locationData, setLocationData] = useState({
    latitude: null as number | null,
    longitude: null as number | null,
    location_address: "",
  });

  useEffect(() => {
    if (isOpen && employeeId) {
      loadProfile();
    }
  }, [isOpen, employeeId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await userService.getProfile(employeeId);
      setProfile(data);
      setFormData({
        full_name: data.full_name || "",
        phone: data.phone || "",
        department: data.department || "",
        position: data.position || "",
        hire_date: data.hire_date || "",
      });
      setLocationData({
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        location_address: data.location_address || "",
      });
    } catch (error) {
      console.error("Failed to load profile:", error);
      toast.error("Failed to load employee profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLocationUpdate = (latitude: number, longitude: number, address: string) => {
    setLocationData({
      latitude,
      longitude,
      location_address: address,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      await userService.updateUserProfile(employeeId, {
        ...formData,
        ...locationData,
      });
      toast.success("Employee profile updated successfully");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update employee profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee Profile</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hire_date">Hire Date</Label>
                    <Input
                      id="hire_date"
                      type="date"
                      value={formData.hire_date}
                      onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Location</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocationPickerOpen(true)}
                      className="w-full"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      {locationData.latitude && locationData.longitude
                        ? "Update Location"
                        : "Set Location"}
                    </Button>
                  </div>
                  {locationData.latitude && locationData.longitude && (
                    <div className="text-sm text-muted-foreground">
                      <p>Lat: {locationData.latitude.toFixed(6)}, Lng: {locationData.longitude.toFixed(6)}</p>
                      {locationData.location_address && <p>{locationData.location_address}</p>}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <LocationPicker
        isOpen={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        onLocationSelect={handleLocationUpdate}
        currentLocation={
          locationData.latitude && locationData.longitude
            ? {
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                address: locationData.location_address,
              }
            : undefined
        }
      />
    </>
  );
}
