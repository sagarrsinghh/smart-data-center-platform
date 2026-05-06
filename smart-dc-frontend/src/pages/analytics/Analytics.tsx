import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getComputeTrends, getStorageTrends } from "../../api/infra.api";
import MainLayout from "../../layouts/MainLayout";
import { unwrapApiData } from "../../utils/api";

const panelStyle = {
  background:
    "linear-gradient(180deg, rgba(29,47,82,0.92) 0%, rgba(17,29,51,0.96) 100%)",
  backdropFilter: "blur(22px)",
};

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[22px] border border-white/10 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${className}`}
      style={panelStyle}
    >
      <div className="mb-4 border-b border-white/8 pb-3">
        <h2 className="text-[15px] font-semibold tracking-wide text-slate-100">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [computeTrends, setComputeTrends] = useState<any[]>([]);
  const [storageTrends, setStorageTrends] = useState<any[]>([]);

  useEffect(() => {
    void fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [compRes, storRes] = await Promise.all([
        getComputeTrends(),
        getStorageTrends(),
      ]);

      setComputeTrends(unwrapApiData<any[]>(compRes) || []);
      setStorageTrends(unwrapApiData<any[]>(storRes) || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Capacity & Trends Analytics</h1>
          <p className="text-sm text-gray-400 mt-1">
            Historical month-over-month infrastructure capacity tracking.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading analytics...</div>
      ) : computeTrends.length === 0 ? (
        <div className="flex min-h-[70vh] items-center justify-center text-slate-400">
          No historical data found. Please import data to see trends.
        </div>
      ) : (
        <div className="space-y-8">
          {/* COMPUTE DOMAIN */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2">
              Compute Domain (Project Level)
            </h2>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <Panel title="Month-Over-Month VM Growth">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={computeTrends} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="month" tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(value: any) => `${value} VMs`}
                        contentStyle={{
                          background: "#0c1730",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 14,
                        }}
                      />
                      <Bar dataKey="totalProjectVms" name="Total VMs" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="Month-Over-Month CPU Growth">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={computeTrends} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="month" tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: "#0c1730",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 14,
                        }}
                      />
                      <Line type="monotone" dataKey="totalProjectCpu" name="Total CPU (Project)" stroke="#63a5ff" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="Month-Over-Month RAM Growth (GB)">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={computeTrends} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <defs>
                        <linearGradient id="ramColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8d6df5" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#8d6df5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="month" tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: "#0c1730",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 14,
                        }}
                      />
                      <Area type="monotone" dataKey="totalProjectRamGb" name="Total RAM (GB)" stroke="#8d6df5" fillOpacity={1} fill="url(#ramColor)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>
          </div>

          {/* STORAGE DOMAIN */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2">
              Storage Domain (Infra Level)
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Panel title="Storage Utilization Trend (%)">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={storageTrends} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="month" tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(value: any) => `${value}%`}
                        contentStyle={{
                          background: "#0c1730",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 14,
                        }}
                      />
                      <Line type="monotone" dataKey="utilizationPercent" name="Utilization (%)" stroke="#f0a144" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="Storage Capacity (TB)">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={storageTrends} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="month" tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(value: any) => `${value} TB`}
                        contentStyle={{
                          background: "#0c1730",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 14,
                        }}
                      />
                      <Bar dataKey="totalCapacityTb" name="Total Capacity (TB)" fill="#52a96a" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="usedCapacityTb" name="Used Capacity (TB)" fill="#df4b5f" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
