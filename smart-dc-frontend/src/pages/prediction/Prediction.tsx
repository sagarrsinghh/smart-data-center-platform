import { useEffect, useState, useMemo } from "react";
import { getProjectTopConsumers, getStorageSummary, getProjectSummary } from "../../api/infra.api";
import MainLayout from "../../layouts/MainLayout";
import { unwrapApiData } from "../../utils/api";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const panelStyle = {
  background: "linear-gradient(180deg, rgba(29,47,82,0.92) 0%, rgba(17,29,51,0.96) 100%)",
  backdropFilter: "blur(22px)",
};

export default function Prediction() {
  const [loading, setLoading] = useState(true);
  const [consumers, setConsumers] = useState<any>({});
  const [storage, setStorage] = useState<any>({});
  const [projects, setProjects] = useState<any>({});
  const [activeTab, setActiveTab] = useState<"baselines" | "optimizer">("baselines");
  const [growthSimulation, setGrowthSimulation] = useState<number>(0);

  useEffect(() => {
    void fetchCapacity();
  }, []);

  const fetchCapacity = async () => {
    try {
      setLoading(true);
      const [consumersRes, storageRes, projRes] = await Promise.all([
        getProjectTopConsumers(),
        getStorageSummary(),
        getProjectSummary()
      ]);

      setConsumers(unwrapApiData<any>(consumersRes) || {});
      setStorage(unwrapApiData<any>(storageRes) || {});
      setProjects(unwrapApiData<any>(projRes) || {});
    } finally {
      setLoading(false);
    }
  };

  // Simulated metrics based on What-If growth slider
  const simulatedLocations = useMemo(() => {
    if (!storage.locations) return [];
    return storage.locations.map((loc: any) => {
      const simulatedUsed = loc.usedCapacityTb * (1 + growthSimulation / 100);
      const simulatedUtil = loc.totalCapacityTb > 0 ? (simulatedUsed / loc.totalCapacityTb) * 100 : 0;
      const simulatedBuffer = Math.max(loc.totalCapacityTb - simulatedUsed, 0);
      
      // Calculate stress ratio: Allocated vs Usable Capacity (Thin provisioning risk index)
      const stressRatio = loc.totalCapacityTb > 0 ? (loc.allocatedCapacityTb / loc.totalCapacityTb) * 100 : 0;
      
      // Standard monthly growth projection (assume 2% monthly base growth)
      const monthlyGrowth = loc.usedCapacityTb * 0.02;
      const runwayMonths = monthlyGrowth > 0 ? simulatedBuffer / monthlyGrowth : 99;
      
      return {
        ...loc,
        simulatedUsed,
        simulatedUtil,
        simulatedBuffer,
        stressRatio,
        runwayMonths: simulatedUtil >= 100 ? 0 : runwayMonths,
      };
    });
  }, [storage.locations, growthSimulation]);

  // Area chart timeline forecast (6 months runway)
  const forecastDataset = useMemo(() => {
    if (!storage.locations) return [];
    const months = ["Current", "Month 1", "Month 2", "Month 3", "Month 4", "Month 5", "Month 6"];
    return months.map((monthName, index) => {
      const dataPoint: any = { month: monthName };
      storage.locations.forEach((loc: any) => {
        const simulatedUsedAtStart = loc.usedCapacityTb * (1 + growthSimulation / 100);
        const monthlyGrowth = loc.usedCapacityTb * 0.02;
        const projectedUsed = Math.min(
          simulatedUsedAtStart + index * monthlyGrowth,
          loc.totalCapacityTb
        );
        const projectedUtil = loc.totalCapacityTb > 0 ? (projectedUsed / loc.totalCapacityTb) * 100 : 0;
        dataPoint[loc.locationCode] = Number(projectedUtil.toFixed(1));
      });
      return dataPoint;
    });
  }, [storage.locations, growthSimulation]);

  // Dynamic Decision/Rebalancing Advice
  const optimizationAdvisories = useMemo(() => {
    const alerts: string[] = [];
    let hotspotCount = 0;
    let targetLoc = "";

    simulatedLocations.forEach((loc: any) => {
      if (loc.simulatedUtil >= 80) {
        hotspotCount++;
      }
      if (loc.simulatedUtil < 60 && loc.simulatedBuffer > 1000) {
        targetLoc = loc.locationCode;
      }
    });

    if (hotspotCount > 0 && targetLoc) {
      alerts.push(
        `🚨 High Capacity Pressure detected in ${hotspotCount} location(s). We highly recommend redirecting pending virtual disk storage requests and non-critical snapshots to the ${targetLoc} platform, which possesses a healthy capacity buffer.`
      );
    }

    // High Over-Provisioning Warning
    simulatedLocations.forEach((loc: any) => {
      if (loc.stressRatio > 180) {
        alerts.push(
          `⚠️ Storage Stress Alert: ${loc.locationCode} is provisioned at ${loc.stressRatio.toFixed(0)}% of physical capacity. Thin provisioning ratio is extremely high; stop further allocation pools until hardware expansion is secured.`
        );
      }
    });

    if (alerts.length === 0) {
      alerts.push("✨ Platform storage utilization across all locations is stable. No rebalancing actions are required.");
    }

    return alerts;
  }, [simulatedLocations]);

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Capacity & Intelligence Planning</h1>
          <p className="text-sm text-gray-400 mt-1">
            Predictive infrastructure management, capacity runways, and smart storage load rebalancing.
          </p>
        </div>
        
        {/* Toggle Tabs */}
        <div className="flex rounded-xl bg-slate-900/60 p-1 border border-white/10 self-start">
          <button
            onClick={() => setActiveTab("baselines")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === "baselines" ? "bg-indigo-600 text-white shadow-md" : "text-gray-400 hover:text-white"
            }`}
          >
            Compute Baselines
          </button>
          <button
            onClick={() => setActiveTab("optimizer")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
              activeTab === "optimizer" ? "bg-emerald-600 text-white shadow-md" : "text-gray-400 hover:text-white"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Storage Optimizer Hub
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading planning telemetry...</div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: BASELINES */}
          {activeTab === "baselines" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Platform Total CPU", value: `${Number(projects.totalCpu || 0).toFixed(1)} Cores` },
                  { label: "Platform Total RAM", value: `${Number(projects.totalRamGb || 0).toFixed(1)} GB` },
                  { label: "Total Platform Storage", value: `${Number(storage.totalCapacityTb || 0).toFixed(1)} TB` },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/[0.06] p-6 shadow-md transition hover:border-indigo-500/20"
                    style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
                  >
                    <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">{item.label}</p>
                    <p className="mt-3 text-3xl font-extrabold text-white tracking-tight">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div
                  className="rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col"
                  style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
                >
                  <div className="px-6 py-4 border-b border-white/[0.06] bg-slate-900/30">
                    <h2 className="text-base font-semibold text-white">Top 5 CPU Heavy Projects</h2>
                    <p className="text-xs text-slate-400 mt-1">Projects consuming the highest amount of compute resources.</p>
                  </div>
                  
                  <div className="overflow-x-auto flex-1 p-2">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-white/[0.04]">
                        {(consumers.topByCpu || []).map((p: any) => (
                          <tr key={p.projectId} className="hover:bg-white/[0.02] transition">
                            <td className="px-4 py-3 text-slate-200 font-medium">{p.projectName}</td>
                            <td className="px-4 py-3 text-cyan-400 text-right font-semibold">{p.totalCpu} CPU Cores</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div
                  className="rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col"
                  style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
                >
                  <div className="px-6 py-4 border-b border-white/[0.06] bg-slate-900/30">
                    <h2 className="text-base font-semibold text-white">Top 5 RAM Heavy Projects</h2>
                    <p className="text-xs text-slate-400 mt-1">Projects consuming the highest amount of memory.</p>
                  </div>
                  
                  <div className="overflow-x-auto flex-1 p-2">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-white/[0.04]">
                        {(consumers.topByRam || []).map((p: any) => (
                          <tr key={p.projectId} className="hover:bg-white/[0.02] transition">
                            <td className="px-4 py-3 text-slate-200 font-medium">{p.projectName}</td>
                            <td className="px-4 py-3 text-purple-400 text-right font-semibold">{p.totalRamGb} GB RAM</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Standard runway view */}
              <div
                className="rounded-2xl border border-white/[0.06] overflow-hidden"
                style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
              >
                <div className="px-6 py-4 border-b border-white/[0.06] bg-slate-900/30">
                  <h2 className="text-base font-semibold text-white">Standard Capacity Runway</h2>
                  <p className="text-xs text-slate-400 mt-1">Available buffer in existing storage locations.</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                        <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-slate-400">Location</th>
                        <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-slate-400">Total usable capacity</th>
                        <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-slate-400">Used capacity</th>
                        <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-emerald-400/80">Available runway</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {(storage.locations || []).map((loc: any) => (
                        <tr key={loc.locationCode} className="hover:bg-white/[0.02] transition">
                          <td className="px-6 py-4 text-white font-semibold">{loc.locationCode}</td>
                          <td className="px-6 py-4 text-slate-300">{Number(loc.totalCapacityTb).toFixed(1)} TB</td>
                          <td className="px-6 py-4 text-amber-400 text-opacity-80 font-medium">{Number(loc.usedCapacityTb).toFixed(1)} TB</td>
                          <td className="px-6 py-4 text-emerald-400 font-bold">{Number(loc.unusedCapacityTb).toFixed(1)} TB free</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STORAGE OPTIMIZER CONTROL ROOM */}
          {activeTab === "optimizer" && (
            <div className="space-y-6">
              
              {/* Top Slider Simulator Panel */}
              <div
                className="rounded-2xl border border-emerald-500/20 p-6 flex flex-col md:flex-row items-center gap-8"
                style={{
                  background: "linear-gradient(180deg, rgba(20,38,64,0.92) 0%, rgba(12,24,41,0.96) 100%)",
                  backdropFilter: "blur(22px)",
                }}
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    <h2 className="text-lg font-bold text-white tracking-tight">Interactive "What-If" Growth Simulator</h2>
                  </div>
                  <p className="text-xs text-slate-400">
                    Slide to simulate platform-wide storage expansion. All metrics, rebalancing advices, and runway graphs will update in real-time.
                  </p>
                </div>
                
                <div className="w-full md:w-[350px] shrink-0 space-y-2 bg-slate-900/50 p-4 rounded-xl border border-white/5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-300">Projected Growth</span>
                    <span className="text-emerald-400 text-sm font-bold">+{growthSimulation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={growthSimulation}
                    onChange={(e) => setGrowthSimulation(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Baseline (0%)</span>
                    <span>50% growth</span>
                    <span>100% growth</span>
                  </div>
                </div>
              </div>

              {/* Stress Ratios & Runway Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {simulatedLocations.map((loc: any) => {
                  const stressColor = loc.stressRatio >= 200 
                    ? "border-red-500/20 bg-red-950/20 text-red-400" 
                    : loc.stressRatio >= 100 
                      ? "border-amber-500/20 bg-amber-950/20 text-amber-400" 
                      : "border-sky-500/20 bg-sky-950/20 text-sky-400";
                  
                  const utilColor = loc.simulatedUtil >= 85 
                    ? "bg-red-500" 
                    : loc.simulatedUtil >= 70 
                      ? "bg-amber-500" 
                      : "bg-emerald-500";

                  return (
                    <div
                      key={loc.locationCode}
                      className="rounded-2xl border border-white/[0.06] p-5 flex flex-col justify-between"
                      style={panelStyle}
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="text-sm font-bold text-white tracking-tight">{loc.locationCode}</h3>
                          <span className="text-[10px] uppercase font-semibold text-slate-500">{loc.assetCount} arrays</span>
                        </div>
                        
                        {/* Simulated Utilization Meter */}
                        <div className="mt-4 space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Projected Util.</span>
                            <span className="font-bold text-slate-200">{loc.simulatedUtil.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full ${utilColor} rounded-full transition-all duration-300`} style={{ width: `${Math.min(loc.simulatedUtil, 100)}%` }} />
                          </div>
                        </div>

                        {/* Thin Provisioning / Stress Ratio Badge */}
                        <div className={`mt-5 p-3 rounded-xl border flex flex-col gap-0.5 ${stressColor}`}>
                          <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">Over-Provisioning Index</span>
                          <span className="text-lg font-extrabold tracking-tight">{loc.stressRatio.toFixed(0)}%</span>
                        </div>
                      </div>

                      <div className="mt-6 border-t border-white/5 pt-3 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Runway Forecast:</span>
                        <span className={`font-bold ${loc.runwayMonths === 0 ? "text-red-500" : loc.runwayMonths < 6 ? "text-amber-500" : "text-emerald-400"}`}>
                          {loc.runwayMonths === 0 ? "Exhausted" : loc.runwayMonths > 72 ? "Multi-Year Safety" : `${loc.runwayMonths.toFixed(1)} months`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic recommendation & forecast graph flex block */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* Decision Advisory Block */}
                <div
                  className="rounded-2xl border border-white/[0.06] p-6 flex flex-col"
                  style={panelStyle}
                >
                  <div className="border-b border-white/[0.06] pb-3 mb-4">
                    <h3 className="text-base font-bold text-white">Smart Decision Advisories</h3>
                    <p className="text-xs text-slate-400 mt-1">Real-time load optimization recommendations.</p>
                  </div>
                  
                  <div className="flex-1 space-y-4 overflow-y-auto">
                    {optimizationAdvisories.map((alert, i) => (
                      <div
                        key={i}
                        className={`p-4 rounded-xl border text-xs leading-relaxed transition ${
                          alert.startsWith("🚨") 
                            ? "bg-red-500/10 border-red-500/20 text-red-200" 
                            : alert.startsWith("⚠️") 
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-200" 
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                        }`}
                      >
                        {alert}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Forecast Timeline Chart */}
                <div
                  className="rounded-2xl border border-white/[0.06] p-6 xl:col-span-2 flex flex-col"
                  style={panelStyle}
                >
                  <div className="border-b border-white/[0.06] pb-3 mb-4 flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-bold text-white">6-Month Projected Utilization Curve</h3>
                      <p className="text-xs text-slate-400 mt-1">Projected exhaustion timeline at simulated growth.</p>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-semibold uppercase">
                      Runway Forecast
                    </span>
                  </div>

                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={forecastDataset} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorP1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorP3" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#c084fc" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#c084fc" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorP4" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4ade80" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorDR" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#fb7185" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#fb7185" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="month" tick={{ fill: "#9eb1cf", fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: "#9eb1cf", fontSize: 10 }} />
                        <Tooltip
                          formatter={(value: any) => [`${value}%`, "Projected Util."]}
                          contentStyle={{
                            background: "#0c1730",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 12,
                          }}
                        />
                        <Area type="monotone" dataKey="RSDC-P1" stroke="#38bdf8" fillOpacity={1} fill="url(#colorP1)" strokeWidth={2} />
                        <Area type="monotone" dataKey="RSDC-P3" stroke="#c084fc" fillOpacity={1} fill="url(#colorP3)" strokeWidth={2} />
                        <Area type="monotone" dataKey="RSDC-P4" stroke="#4ade80" fillOpacity={1} fill="url(#colorP4)" strokeWidth={2} />
                        <Area type="monotone" dataKey="RSDC-DR" stroke="#fb7185" fillOpacity={1} fill="url(#colorDR)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Legend Indicator */}
                  <div className="mt-4 flex flex-wrap gap-4 justify-center text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#38bdf8]" /> RSDC-P1</div>
                    <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#c084fc]" /> RSDC-P3</div>
                    <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#4ade80]" /> RSDC-P4</div>
                    <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#fb7185]" /> RSDC-DR</div>
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>
      )}
    </MainLayout>
  );
}
