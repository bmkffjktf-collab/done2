import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Activity, AlertTriangle, Clock, Zap } from 'lucide-react';

interface DashboardProps {
  congestionScore: number;
  waitingTime: number;
  efficiency: number;
  aiStrategy: string;
  history: any[];
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  congestionScore, 
  waitingTime, 
  efficiency, 
  aiStrategy,
  history 
}) => {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Congestion" 
          value={`${congestionScore}%`} 
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
          trend={congestionScore > 70 ? 'High' : 'Stable'}
        />
        <StatCard 
          label="Avg Wait" 
          value={`${waitingTime}s`} 
          icon={<Clock className="w-4 h-4 text-blue-500" />}
          trend="-12%"
        />
        <StatCard 
          label="Efficiency" 
          value={`${efficiency}%`} 
          icon={<Zap className="w-4 h-4 text-emerald-500" />}
          trend="+5%"
        />
        <StatCard 
          label="AI Status" 
          value="Active" 
          icon={<Activity className="w-4 h-4 text-purple-500" />}
          trend="Optimizing"
        />
      </div>

      {/* AI Strategy Box */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-2">
          <Zap className="w-3 h-3 text-purple-400" />
          AI Decision Engine
        </h3>
        <p className="text-sm text-zinc-300 font-medium leading-relaxed italic">
          "{aiStrategy}"
        </p>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 h-64">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-4">Congestion Trend</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="time" hide />
              <YAxis stroke="#52525b" fontSize={10} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                itemStyle={{ color: '#a1a1aa' }}
              />
              <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, trend }: any) => (
  <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{label}</span>
      {icon}
    </div>
    <div className="text-2xl font-semibold text-white mb-1">{value}</div>
    <div className="text-[10px] font-medium text-zinc-400">{trend}</div>
  </div>
);
