import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ArcGISMap from './ArcGISMap';
import { MapPin } from 'lucide-react';

interface LocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (latitude: number, longitude: number, address: string) => void;
  currentLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  isOpen,
  onClose,
  onLocationSelect,
  currentLocation,
}) => {
  const [selectedLat, setSelectedLat] = useState<number | null>(
    currentLocation?.latitude || null
  );
  const [selectedLng, setSelectedLng] = useState<number | null>(
    currentLocation?.longitude || null
  );
  const [selectedAddress, setSelectedAddress] = useState<string>(
    currentLocation?.address || ''
  );

  const handleMapClick = (lat: number, lng: number, address: string) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    setSelectedAddress(address);
  };

  const handleSave = () => {
    if (selectedLat !== null && selectedLng !== null) {
      onLocationSelect(selectedLat, selectedLng, selectedAddress);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Select Location</DialogTitle>
          <DialogDescription>
            Click on the map to select a location for this employee
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="h-[400px] w-full border rounded-lg overflow-hidden">
            <ArcGISMap
              center={
                currentLocation
                  ? [currentLocation.longitude, currentLocation.latitude]
                  : [0, 0]
              }
              zoom={currentLocation ? 10 : 2}
              markers={
                selectedLat && selectedLng
                  ? [
                      {
                        latitude: selectedLat,
                        longitude: selectedLng,
                        title: 'Selected Location',
                        description: selectedAddress,
                      },
                    ]
                  : []
              }
              interactive
              onLocationSelect={handleMapClick}
            />
          </div>

          {selectedLat !== null && selectedLng !== null && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Selected Location</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Latitude</Label>
                  <Input value={selectedLat.toFixed(6)} readOnly />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input value={selectedLng.toFixed(6)} readOnly />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={selectedAddress}
                  onChange={(e) => setSelectedAddress(e.target.value)}
                  placeholder="Enter address"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={selectedLat === null || selectedLng === null}
            >
              Save Location
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LocationPicker;
