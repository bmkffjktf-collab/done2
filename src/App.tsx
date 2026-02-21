import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Car, 
  Bus, 
  Truck, 
  Bike, 
  ShieldAlert, 
  Plus, 
  Settings2, 
  ChevronRight,
  Navigation,
  Activity
} from 'lucide-react';
import { MapPicker } from './components/MapPicker';
import { TrafficSimulation } from './components/TrafficSimulation';
import { Dashboard } from './components/Dashboard';
import { 
  Vehicle, 
  VehicleType, 
  SignalState, 
  CITIES, 
  VEHICLE_CONFIGS 
} from './types';
import { analyzeTraffic, TrafficAnalysis } from './services/geminiService';

export default function App() {
  const [selectedCity, setSelectedCity] = useState(CITIES[0]);
  const [selectedIntersection, setSelectedIntersection] = useState(CITIES[0].intersections[0]);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>([12.9716, 77.5946]); // Default Bengaluru
  const [isSimulating, setIsSimulating] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [signals, setSignals] = useState<SignalState[]>([
    { lane: 0, state: 'GREEN', timer: 10 },
    { lane: 1, state: 'RED', timer: 10 },
    { lane: 2, state: 'GREEN', timer: 10 },
    { lane: 3, state: 'RED', timer: 10 },
  ]);
  const [analysis, setAnalysis] = useState<TrafficAnalysis>({
    signalStrategy: "Initializing AI engine...",
    predictedCongestion: 0,
    optimizationReasoning: "Gathering initial traffic patterns.",
    suggestedRerouting: []
  });
  const [history, setHistory] = useState<{ time: string; score: number }[]>([]);
  const [placementType, setPlacementType] = useState<VehicleType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [viewMode, setViewMode] = useState<'MAP' | 'CANVAS'>('CANVAS');

  // Animation Loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setVehicles(prev => prev.map(v => {
        const signal = signals.find(s => s.lane === v.lane);
        const isGreen = signal?.state === 'GREEN';
        
        let canMove = true;
        
        // Stop at signal if RED
        if (!isGreen && v.position > 0.35 && v.position < 0.45) {
          canMove = false;
        }

        // Simple collision check
        const ahead = prev.find(other => 
          other.id !== v.id && 
          other.lane === v.lane && 
          other.position > v.position && 
          other.position - v.position < 0.08
        );
        if (ahead) canMove = false;

        if (canMove) {
          const newPos = v.position + v.speed;
          return { ...v, position: newPos > 1.2 ? -0.2 : newPos };
        }
        return v;
      }));
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [isSimulating, signals]);

  // Weighted Congestion Model
  const calculateCongestion = useCallback(() => {
    const totalWeight = vehicles.reduce((acc, v) => acc + VEHICLE_CONFIGS[v.type].size, 0);
    const score = Math.min(100, Math.round((totalWeight / 20) * 100));
    return score;
  }, [vehicles]);

  // AI Analysis Loop
  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(async () => {
      const densityData = {
        totalVehicles: vehicles.length,
        laneDensity: [0, 1, 2, 3].map(l => 
          vehicles.filter(v => v.lane === l).reduce((acc, v) => acc + VEHICLE_CONFIGS[v.type].size, 0)
        ),
        emergencyPresent: vehicles.some(v => v.type === 'EMERGENCY')
      };

      const result = await analyzeTraffic(selectedCity.name, selectedIntersection, densityData);
      setAnalysis(result);
      
      setHistory(prev => [...prev.slice(-20), { 
        time: new Date().toLocaleTimeString(), 
        score: calculateCongestion() 
      }]);
    }, 5000);

    return () => clearInterval(interval);
  }, [vehicles, selectedCity, selectedIntersection, calculateCongestion]);

  // Signal Logic
  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      setSignals(prev => {
        // Emergency vehicle override
        const emergencyLane = vehicles.find(v => v.type === 'EMERGENCY')?.lane;
        if (emergencyLane !== undefined) {
          return prev.map(s => ({
            ...s,
            state: s.lane === emergencyLane || s.lane === (emergencyLane + 2) % 4 ? 'GREEN' : 'RED'
          }));
        }

        // Adaptive logic: Find lane with highest density
        const laneDensities = [0, 1, 2, 3].map(l => 
          vehicles.filter(v => v.lane === l && v.position < 0.5).reduce((acc, v) => acc + VEHICLE_CONFIGS[v.type].size, 0)
        );

        return prev.map(s => {
          if (s.timer <= 0) {
            // If current is GREEN, switch to YELLOW
            if (s.state === 'GREEN') {
              return { ...s, state: 'YELLOW', timer: 3 };
            }
            // If current is YELLOW, switch to RED
            if (s.state === 'YELLOW') {
              return { ...s, state: 'RED', timer: 1 };
            }
            // If current is RED, check if it's the turn for this lane (or opposite)
            // We prioritize lanes with higher density
            const isNorthSouth = s.lane === 0 || s.lane === 2;
            const nsDensity = laneDensities[0] + laneDensities[2];
            const ewDensity = laneDensities[1] + laneDensities[3];

            const shouldBeGreen = isNorthSouth ? nsDensity >= ewDensity : ewDensity > nsDensity;
            
            // Only switch to GREEN if the other pair is RED
            const otherPairIsRed = prev.filter(other => 
              (isNorthSouth ? (other.lane === 1 || other.lane === 3) : (other.lane === 0 || other.lane === 2))
            ).every(other => other.state === 'RED');

            if (shouldBeGreen && otherPairIsRed) {
              return { ...s, state: 'GREEN', timer: 15 };
            }
          }
          return { ...s, timer: Math.max(0, s.timer - 1) };
        });
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [vehicles, isSimulating]);

  const addVehicle = (type: VehicleType, lane?: number, position?: number) => {
    const count = quantity || 1;
    const newVehicles: Vehicle[] = [];
    
    for (let i = 0; i < count; i++) {
      const finalLane = lane ?? Math.floor(Math.random() * 4);
      // Increased spacing for better visibility on map
      const spacing = type === 'BIKE' ? 0.03 : 0.06;
      const finalPos = position !== undefined ? position - (i * spacing) : -(i * spacing);
      
      newVehicles.push({
        id: Math.random().toString(36).substr(2, 9) + i,
        type,
        lane: finalLane,
        position: finalPos,
        speed: VEHICLE_CONFIGS[type].speed,
        size: VEHICLE_CONFIGS[type].size,
        color: VEHICLE_CONFIGS[type].color,
      });
    }
    
    setVehicles(prev => [...prev, ...newVehicles]);
    setPlacementType(null);
    setQuantity(1);
  };

  const handleLaneClick = (lane: number, position: number) => {
    if (placementType) {
      addVehicle(placementType, lane, position);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (placementType && selectedCoords) {
      const [cLat, cLng] = selectedCoords;
      const dLat = lat - cLat;
      const dLng = lng - cLng;
      
      // Determine lane based on relative position to center
      let lane = 0;
      const threshold = 0.0001; // Snap threshold
      
      if (Math.abs(dLng) < threshold) {
        lane = dLat > 0 ? 0 : 2; // North or South
      } else if (Math.abs(dLat) < threshold) {
        lane = dLng > 0 ? 1 : 3; // East or West
      } else {
        // Fallback to quadrant detection
        if (Math.abs(dLat) > Math.abs(dLng)) {
          lane = dLat > 0 ? 0 : 2;
        } else {
          lane = dLng > 0 ? 1 : 3;
        }
      }
      
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      // Map distance to simulation position (0.4 is the stop line)
      const position = Math.max(-0.2, 0.4 - (dist / 0.0015)); 
      
      addVehicle(placementType, lane, position);
    }
  };

  const handleLocationSelect = (lat: number, lng: number, name: string) => {
    setSelectedCoords([lat, lng]);
    setSelectedIntersection(name);
    setIsSimulating(false);
    // Removed setVehicles([]) to "save" existing vehicles when moving locations
    setViewMode('MAP'); 
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-purple-500/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight uppercase">VahanSetu</h1>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Digital Twin • Traffic AI</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-white/5">
              <button 
                onClick={() => setViewMode('CANVAS')}
                className={`px-3 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all ${viewMode === 'CANVAS' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Digital Twin
              </button>
              <button 
                onClick={() => setViewMode('MAP')}
                className={`px-3 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all ${viewMode === 'MAP' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Geospatial
              </button>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                {isSimulating ? 'Live Feed' : 'Paused'}
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3" />
                {vehicles.length} Active Units
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Map & Simulation */}
        <div className="lg:col-span-8 space-y-6">
          {viewMode === 'MAP' ? (
            <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-1 relative h-[600px]">
              <MapPicker 
                onLocationSelect={handleLocationSelect} 
                selectedLocation={selectedCoords} 
                vehicles={vehicles}
                onMapClick={placementType ? handleMapClick : undefined}
              />
              {/* Overlay Controls for Map View */}
              <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
                <InjectionPanel 
                  isSimulating={isSimulating}
                  setIsSimulating={setIsSimulating}
                  placementType={placementType}
                  setPlacementType={setPlacementType}
                  quantity={quantity}
                  setQuantity={setQuantity}
                  addVehicle={addVehicle}
                  setVehicles={setVehicles}
                />
              </div>
            </div>
          ) : (
            <div className="relative group">
              <TrafficSimulation 
                vehicles={vehicles} 
                signals={signals} 
                onVehicleUpdate={setVehicles}
                isSimulating={isSimulating}
                onLaneClick={handleLaneClick}
              />
              
              {/* Overlay Controls for Canvas View */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <InjectionPanel 
                  isSimulating={isSimulating}
                  setIsSimulating={setIsSimulating}
                  placementType={placementType}
                  setPlacementType={setPlacementType}
                  quantity={quantity}
                  setQuantity={setQuantity}
                  addVehicle={addVehicle}
                  setVehicles={setVehicles}
                />
              </div>

              <div className="absolute bottom-4 right-4">
                <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl min-w-[200px]">
                  <h3 className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Active Junction</h3>
                  <div className="text-xs font-medium text-zinc-300 truncate max-w-[180px]">
                    {selectedIntersection}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rerouting Suggestions */}
          <AnimatePresence>
            {analysis.suggestedRerouting.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-4"
              >
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Navigation className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-blue-400 mb-1">Intelligent Rerouting Suggested</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.suggestedRerouting.map((route, idx) => (
                      <span key={idx} className="text-[10px] bg-blue-500/20 px-2 py-1 rounded-full text-blue-300 font-mono">
                        {route}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Dashboard & Insights */}
        <div className="lg:col-span-4 space-y-6">
          <Dashboard 
            congestionScore={calculateCongestion()}
            waitingTime={Math.max(0, 15 - (vehicles.length * 0.5))}
            efficiency={92 - (calculateCongestion() * 0.4)}
            aiStrategy={analysis.signalStrategy}
            history={history}
          />

          <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500">Optimization Reasoning</h3>
              <Settings2 className="w-4 h-4 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {analysis.optimizationReasoning}
            </p>
            <div className="mt-6 pt-6 border-t border-white/5">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">
                <span>Lane Priority</span>
                <span>Density</span>
              </div>
              {[0, 1, 2, 3].map(lane => {
                const laneVehicles = vehicles.filter(v => v.lane === lane);
                const density = laneVehicles.reduce((acc, v) => acc + VEHICLE_CONFIGS[v.type].size, 0);
                const percentage = Math.min(100, (density / 10) * 100);
                return (
                  <div key={lane} className="mb-3 last:mb-0">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-zinc-400">Lane {['North', 'East', 'South', 'West'][lane]}</span>
                      <span className="font-mono">{Math.round(percentage)}%</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className={`h-full rounded-full ${percentage > 70 ? 'bg-red-500' : percentage > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const ControlButton = ({ icon, label, onClick, active, className = "" }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all group ${
      active 
        ? "bg-emerald-500/20 border-emerald-500/50" 
        : "bg-zinc-800/50 border-white/5 hover:bg-zinc-800"
    } ${className}`}
  >
    <div className={`${active ? "text-emerald-400" : "text-zinc-400"} group-hover:text-white mb-1`}>
      {React.cloneElement(icon, { size: 16 })}
    </div>
    <span className={`text-[10px] font-mono ${active ? "text-emerald-300" : "text-zinc-500"} group-hover:text-zinc-300`}>{label}</span>
  </button>
);

const InjectionPanel = ({ 
  isSimulating, 
  setIsSimulating, 
  placementType, 
  setPlacementType, 
  quantity, 
  setQuantity, 
  addVehicle,
  setVehicles 
}: any) => (
  <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Injection Control</h3>
      <button 
        onClick={() => setIsSimulating(!isSimulating)}
        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
          isSimulating ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
        }`}
      >
        {isSimulating ? 'Stop' : 'Run'}
      </button>
    </div>
    
    <div className="mb-3">
      <label className="text-[9px] font-mono uppercase text-zinc-600 block mb-1">Quantity</label>
      <input 
        type="number" 
        value={quantity}
        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
        className="w-full bg-zinc-900 border border-white/5 rounded px-2 py-1 text-xs font-mono outline-none focus:border-emerald-500/50"
        min="1"
        max="100"
      />
    </div>

    <div className="grid grid-cols-3 gap-2">
      <ControlButton 
        icon={<Car />} 
        label="Car" 
        active={placementType === 'CAR'}
        onClick={() => setPlacementType('CAR')} 
      />
      <ControlButton 
        icon={<Bike />} 
        label="Bike" 
        active={placementType === 'BIKE'}
        onClick={() => setPlacementType('BIKE')} 
      />
      <ControlButton 
        icon={<Bus />} 
        label="Bus" 
        active={placementType === 'BUS'}
        onClick={() => setPlacementType('BUS')} 
      />
      <ControlButton 
        icon={<Truck />} 
        label="Truck" 
        active={placementType === 'TRUCK'}
        onClick={() => setPlacementType('TRUCK')} 
      />
      <ControlButton 
        icon={<ShieldAlert className="text-red-400" />} 
        label="Ambulance" 
        active={placementType === 'EMERGENCY'}
        onClick={() => setPlacementType('EMERGENCY')}
        className="bg-red-500/10 border-red-500/20 hover:bg-red-500/20"
      />
      <button 
        onClick={() => setVehicles([])}
        className="flex flex-col items-center justify-center p-2 rounded-lg bg-zinc-800/50 border border-white/5 hover:bg-zinc-800 transition-all group"
      >
        <div className="text-zinc-400 group-hover:text-white mb-1 text-[10px] font-mono">CLR</div>
      </button>
    </div>
    {placementType && (
      <div className="mt-3 text-[10px] font-mono text-emerald-400 animate-pulse text-center">
        Click on a road below to place
      </div>
    )}
  </div>
);
