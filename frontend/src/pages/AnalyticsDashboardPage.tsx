import React, { useState, useEffect } from 'react';
import { BarChart2, MessageSquare, Users, Clock, ShieldCheck, RefreshCw, Layers } from 'lucide-react';
import { Header } from '../components/Header';
import type { AnalyticsData } from '../types';

export const AnalyticsDashboardPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/analytics');
      if (response.ok) {
        const json: AnalyticsData = await response.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b]">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3 font-mono">
              <BarChart2 className="w-6 h-6 text-white" />
              Hush System Metrics
            </h1>
            <p className="text-xs text-[#a1a1aa] mt-1 font-mono">
              Live aggregate telemetry • Zero message content stored
            </p>
          </div>

          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="btn-secondary text-xs font-mono py-2 px-3"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Minimal Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass-panel p-5 border border-[#27272a]">
            <div className="flex items-center justify-between text-[#a1a1aa] text-xs font-mono mb-2">
              <span>ACTIVE ROOMS</span>
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div className="text-3xl font-bold font-mono text-white">
              {data ? data.activeRooms : '--'}
            </div>
            <p className="text-[10px] text-[#71717a] font-mono mt-1">Currently in RAM</p>
          </div>

          <div className="glass-panel p-5 border border-[#27272a]">
            <div className="flex items-center justify-between text-[#a1a1aa] text-xs font-mono mb-2">
              <span>CONNECTED USERS</span>
              <Users className="w-4 h-4 text-white" />
            </div>
            <div className="text-3xl font-bold font-mono text-white">
              {data ? data.activeParticipants : '--'}
            </div>
            <p className="text-[10px] text-[#71717a] font-mono mt-1">Active WebSockets</p>
          </div>

          <div className="glass-panel p-5 border border-[#27272a]">
            <div className="flex items-center justify-between text-[#a1a1aa] text-xs font-mono mb-2">
              <span>TOTAL MESSAGES</span>
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div className="text-3xl font-bold font-mono text-white">
              {data ? data.totalMessages.toLocaleString() : '--'}
            </div>
            <p className="text-[10px] text-[#71717a] font-mono mt-1">Transient count only</p>
          </div>

          <div className="glass-panel p-5 border border-[#27272a]">
            <div className="flex items-center justify-between text-[#a1a1aa] text-xs font-mono mb-2">
              <span>AVG DURATION</span>
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div className="text-3xl font-bold font-mono text-white">
              {data ? `${data.avgRoomDurationSeconds}s` : '--'}
            </div>
            <p className="text-[10px] text-[#71717a] font-mono mt-1">Room lifetime average</p>
          </div>
        </div>

        {/* Secondary Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel p-5">
            <h3 className="text-xs font-mono uppercase text-[#a1a1aa] mb-3 font-semibold">
              Pairing Rate
            </h3>
            <div className="text-3xl font-bold font-mono text-white mb-2">
              {data ? `${data.pairingRatePercent}%` : '--'}
            </div>
            <p className="text-xs text-[#71717a] leading-relaxed">
              Percentage of created rooms where a peer joined.
            </p>
          </div>

          <div className="glass-panel p-5 font-mono">
            <h3 className="text-xs uppercase text-[#a1a1aa] mb-3 font-semibold">
              Room Types
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#a1a1aa]">1-to-1 Direct:</span>
                <span className="text-white font-bold">{data ? data.directRoomsCount : 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#a1a1aa]">Group Rooms:</span>
                <span className="text-white font-bold">{data ? data.groupRoomsCount : 0}</span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-5 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-white font-semibold mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Privacy Verified</span>
            </div>
            <p className="text-xs text-[#71717a] leading-relaxed">
              All metrics use thread-safe atomic counters (`AtomicLong`, `LongAdder`). No message content is ever recorded.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
