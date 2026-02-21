export type VehicleType = 'CAR' | 'BIKE' | 'BUS' | 'TRUCK' | 'EMERGENCY';

export interface Vehicle {
  id: string;
  type: VehicleType;
  lane: number; // 0: North, 1: East, 2: South, 3: West
  position: number; // 0 to 1 (progress along lane)
  speed: number;
  size: number; // Weight for congestion model
  color: string;
}

export interface SignalState {
  lane: number;
  state: 'RED' | 'YELLOW' | 'GREEN';
  timer: number;
}

export interface IntersectionData {
  id: string;
  name: string;
  city: string;
  signals: SignalState[];
  vehicles: Vehicle[];
  congestionScore: number;
}

export const VEHICLE_CONFIGS: Record<VehicleType, { size: number; color: string; speed: number }> = {
  CAR: { size: 1, color: '#3b82f6', speed: 0.005 },
  BIKE: { size: 0.4, color: '#10b981', speed: 0.008 },
  BUS: { size: 2.5, color: '#f59e0b', speed: 0.003 },
  TRUCK: { size: 3, color: '#6366f1', speed: 0.002 },
  EMERGENCY: { size: 1.2, color: '#ef4444', speed: 0.01 },
};

export const CITIES = [
  { name: 'Bengaluru', intersections: ['Silk Board Junction', 'Marathahalli Bridge', 'Hebbal Flyover'] },
  { name: 'Mumbai', intersections: ['Worli Naka', 'Marine Drive Crossing', 'Dadar TT'] },
  { name: 'Delhi', intersections: ['ITO Crossing', 'AIIMS Flyover', 'Connaught Place Circle'] },
  { name: 'Hyderabad', intersections: ['Hitech City Junction', 'Jubilee Hills Checkpost'] },
];
