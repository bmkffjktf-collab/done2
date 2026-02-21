import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

import { Vehicle } from '../types';

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number, name: string) => void;
  selectedLocation: [number, number] | null;
  vehicles: Vehicle[];
  onMapClick?: (lat: number, lng: number) => void;
}

const getVehicleLatLng = (v: Vehicle, center: [number, number]): [number, number] => {
  const [lat, lng] = center;
  const scale = 0.0015; 
  const offset = 0.00015; // Adjusted for LHD

  switch (v.lane) {
    case 0: // North to South (Drive on Left -> East side)
      return [lat + (0.4 - v.position) * scale, lng + offset];
    case 1: // East to West (Drive on Left -> South side)
      return [lat - offset, lng + (0.4 - v.position) * scale];
    case 2: // South to North (Drive on Left -> West side)
      return [lat - (0.4 - v.position) * scale, lng - offset];
    case 3: // West to East (Drive on Left -> North side)
      return [lat + offset, lng - (0.4 - v.position) * scale];
    default:
      return [lat, lng];
  }
};

function LocationMarker({ onLocationSelect, selectedLocation, onMapClick }: { onLocationSelect: MapPickerProps['onLocationSelect'], selectedLocation: MapPickerProps['selectedLocation'], onMapClick: MapPickerProps['onMapClick'] }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      } else {
        onLocationSelect(e.latlng.lat, e.latlng.lng, `Junction at ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`);
      }
    },
  });

  return selectedLocation === null ? null : (
    <Marker position={selectedLocation} />
  );
}

export const MapPicker: React.FC<MapPickerProps> = ({ onLocationSelect, selectedLocation, vehicles, onMapClick }) => {
  return (
    <div className="h-full w-full rounded-2xl overflow-hidden border border-white/10 relative">
      <MapContainer
        center={selectedLocation || [20.5937, 78.9629]}
        zoom={selectedLocation ? 18 : 5}
        style={{ height: '100%', width: '100%', background: '#18181b' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <LocationMarker onLocationSelect={onLocationSelect} selectedLocation={selectedLocation} onMapClick={onMapClick} />
        
        {selectedLocation && vehicles.map(v => {
          // Only show vehicles that are within a reasonable range of the junction
          if (v.position < -0.5 || v.position > 1.5) return null;
          
          const pos = getVehicleLatLng(v, selectedLocation);
          // Rotations for LHD: N->S: 180, E->W: 270, S->N: 0, W->E: 90
          const rotation = [180, 270, 0, 90][v.lane];
          const size = v.type === 'BUS' || v.type === 'TRUCK' ? 20 : v.type === 'BIKE' ? 10 : 14;
          
          const icon = L.divIcon({
            className: 'custom-vehicle-icon',
            html: `
              <div style="transform: rotate(${rotation}deg); width: ${size}px; height: ${size * 1.8}px; background: ${v.color}; border-radius: ${size * 0.2}px; border: 1px solid white; position: relative; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                <div style="position: absolute; top: 15%; left: 10%; width: 80%; height: 20%; background: rgba(255,255,255,0.4); border-radius: 1px;"></div>
                <div style="position: absolute; top: 45%; left: 15%; width: 70%; height: 35%; background: rgba(0,0,0,0.15); border-radius: 2px;"></div>
                ${v.type === 'EMERGENCY' ? '<div style="position: absolute; top: 40%; left: 30%; width: 40%; height: 20%; background: #ef4444; border-radius: 50%; animation: pulse 1s infinite;"></div>' : ''}
              </div>
            `,
            iconSize: [size, size * 1.8],
            iconAnchor: [size / 2, (size * 1.8) / 2],
          });

          return (
            <Marker 
              key={v.id} 
              position={pos} 
              icon={icon}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={0.8}>
                <span className="text-[10px] font-mono">{v.type}</span>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.5); opacity: 1; }
          100% { transform: scale(1); opacity: 0.6; }
        }
      `}</style>
      <div className="absolute bottom-4 left-4 z-[1000] bg-black/80 backdrop-blur-md border border-white/10 p-2 rounded-lg text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
        Click on the map to select a junction
      </div>
    </div>
  );
};
