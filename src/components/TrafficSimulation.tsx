import React from 'react';
import { Stage, Layer, Rect, Circle, Line, Group } from 'react-konva';
import { Vehicle, VehicleType, SignalState, VEHICLE_CONFIGS } from '../types';

interface TrafficSimulationProps {
  vehicles: Vehicle[];
  signals: SignalState[];
  onVehicleUpdate: (vehicles: Vehicle[]) => void;
  isSimulating: boolean;
  onLaneClick?: (lane: number, position: number) => void;
}

const CANVAS_SIZE = 600;
const ROAD_WIDTH = 120;
const CENTER = CANVAS_SIZE / 2;

export const TrafficSimulation: React.FC<TrafficSimulationProps> = ({ 
  vehicles, 
  signals, 
  onVehicleUpdate, 
  isSimulating,
  onLaneClick 
}) => {
  const handleStageClick = (e: any) => {
    if (!onLaneClick) return;
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const { x, y } = pointer;
    const halfRoad = ROAD_WIDTH / 2;

    if (Math.abs(x - CENTER) < halfRoad) {
      if (y < CENTER) onLaneClick(0, y / CANVAS_SIZE);
      else onLaneClick(2, 1 - (y / CANVAS_SIZE));
    } else if (Math.abs(y - CENTER) < halfRoad) {
      if (x > CENTER) onLaneClick(1, 1 - (x / CANVAS_SIZE));
      else onLaneClick(3, x / CANVAS_SIZE);
    }
  };

  const getVehicleCoords = (v: Vehicle) => {
    const offset = 25; // Adjusted for LHD and road width
    switch (v.lane) {
      case 0: // North to South (Moving Down)
        return { x: CENTER + offset, y: v.position * CANVAS_SIZE };
      case 1: // East to West (Moving Left)
        return { x: (1 - v.position) * CANVAS_SIZE, y: CENTER + offset };
      case 2: // South to North (Moving Up)
        return { x: CENTER - offset, y: (1 - v.position) * CANVAS_SIZE };
      case 3: // West to East (Moving Right)
        return { x: v.position * CANVAS_SIZE, y: CENTER - offset };
      default:
        return { x: 0, y: 0 };
    }
  };

  return (
    <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl cursor-crosshair">
      <Stage width={CANVAS_SIZE} height={CANVAS_SIZE} onClick={handleStageClick}>
        <Layer>
          {/* Roads */}
          <Rect
            x={CENTER - ROAD_WIDTH / 2}
            y={0}
            width={ROAD_WIDTH}
            height={CANVAS_SIZE}
            fill="#27272a"
          />
          <Rect
            x={0}
            y={CENTER - ROAD_WIDTH / 2}
            width={CANVAS_SIZE}
            height={ROAD_WIDTH}
            fill="#27272a"
          />
          
          {/* Lane Markings */}
          <Line
            points={[CENTER, 0, CENTER, CANVAS_SIZE]}
            stroke="white"
            strokeWidth={2}
            dash={[20, 20]}
          />
          <Line
            points={[0, CENTER, CANVAS_SIZE, CENTER]}
            stroke="white"
            strokeWidth={2}
            dash={[20, 20]}
          />

          {/* Signals */}
          {signals.map((s, i) => {
            const pos = [
              { x: CENTER - 80, y: CENTER - 80 }, // N
              { x: CENTER + 80, y: CENTER - 80 }, // E
              { x: CENTER + 80, y: CENTER + 80 }, // S
              { x: CENTER - 80, y: CENTER + 80 }, // W
            ][s.lane];
            
            return (
              <Group key={s.lane} x={pos.x} y={pos.y}>
                <Rect width={20} height={40} fill="#18181b" cornerRadius={4} />
                <Circle
                  x={10}
                  y={s.state === 'RED' ? 10 : s.state === 'YELLOW' ? 20 : 30}
                  radius={6}
                  fill={s.state === 'RED' ? '#ef4444' : s.state === 'YELLOW' ? '#f59e0b' : '#10b981'}
                  shadowBlur={10}
                  shadowColor={s.state === 'RED' ? '#ef4444' : s.state === 'YELLOW' ? '#f59e0b' : '#10b981'}
                />
              </Group>
            );
          })}

          {/* Vehicles */}
          {vehicles.map(v => {
            const coords = getVehicleCoords(v);
            // Rotations for LHD: N->S: 180, E->W: 270, S->N: 0, W->E: 90
            const rotation = [180, 270, 0, 90][v.lane];
            const size = VEHICLE_CONFIGS[v.type].size;
            const w = 18 * size; // Scaled to road
            const h = 32 * size;

            return (
              <Group key={v.id} x={coords.x} y={coords.y} rotation={rotation}>
                {/* Main Body */}
                <Rect
                  width={w}
                  height={h}
                  fill={v.color}
                  cornerRadius={size * 4}
                  offsetX={w / 2}
                  offsetY={h / 2}
                  shadowBlur={5}
                  shadowColor="black"
                  shadowOpacity={0.3}
                />
                {/* Windshield */}
                <Rect
                  width={w * 0.8}
                  height={h * 0.2}
                  fill="rgba(255,255,255,0.3)"
                  x={-w * 0.4}
                  y={-h * 0.2}
                  cornerRadius={1}
                />
                {/* Roof/Top Detail */}
                <Rect
                  width={w * 0.6}
                  height={h * 0.4}
                  fill="rgba(0,0,0,0.1)"
                  x={-w * 0.3}
                  y={-h * 0.1}
                  cornerRadius={2}
                />
                {/* Headlights */}
                <Rect width={w * 0.2} height={2} fill="#fef08a" x={-w * 0.4} y={h * 0.4} />
                <Rect width={w * 0.2} height={2} fill="#fef08a" x={w * 0.2} y={h * 0.4} />
                
                {v.type === 'EMERGENCY' && (
                  <Circle radius={w * 0.3} fill="#ef4444" opacity={0.6} />
                )}
                {v.type === 'BIKE' && (
                  <Rect width={2} height={h * 0.6} fill="#18181b" x={-1} y={-h * 0.3} />
                )}
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
};
