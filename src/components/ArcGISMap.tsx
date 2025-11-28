import React, { useEffect, useRef } from 'react';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Point from '@arcgis/core/geometry/Point';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import '@arcgis/core/assets/esri/themes/light/main.css';

export interface MapMarker {
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
}

interface ArcGISMapProps {
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
  onLocationSelect?: (lat: number, lng: number, address: string) => void;
  interactive?: boolean;
}

const ArcGISMap: React.FC<ArcGISMapProps> = ({
  markers = [],
  center = [0, 0],
  zoom = 2,
  onLocationSelect,
  interactive = false,
}) => {
  const mapDiv = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (!mapDiv.current) return;

    // Create map
    const map = new Map({
      basemap: 'streets-navigation-vector',
    });

    // Create view
    const view = new MapView({
      container: mapDiv.current,
      map: map,
      center: center,
      zoom: zoom,
    });

    viewRef.current = view;

    // Create graphics layer for markers
    const graphicsLayer = new GraphicsLayer();
    map.add(graphicsLayer);

    // Add markers
    markers.forEach((marker) => {
      const point = new Point({
        longitude: marker.longitude,
        latitude: marker.latitude,
      });

      const markerSymbol = new SimpleMarkerSymbol({
        color: [226, 119, 40],
        outline: {
          color: [255, 255, 255],
          width: 2,
        },
        size: 12,
      });

      const graphic = new Graphic({
        geometry: point,
        symbol: markerSymbol,
        attributes: {
          title: marker.title,
          description: marker.description,
        },
        popupTemplate: {
          title: '{title}',
          content: '{description}',
        },
      });

      graphicsLayer.add(graphic);
    });

    // Handle click events for location selection
    if (interactive && onLocationSelect) {
      view.on('click', async (event) => {
        const { latitude, longitude } = event.mapPoint;
        
        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?f=json&location=${longitude},${latitude}`
          );
          const data = await response.json();
          const address = data.address?.LongLabel || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          onLocationSelect(latitude, longitude, address);
        } catch (error) {
          console.error('Error reverse geocoding:', error);
          onLocationSelect(latitude, longitude, `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
      });
    }

    return () => {
      view.destroy();
    };
  }, [markers, center, zoom, interactive, onLocationSelect]);

  return <div ref={mapDiv} className="w-full h-full rounded-lg" />;
};

export default ArcGISMap;
