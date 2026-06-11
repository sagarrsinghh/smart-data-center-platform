import { useEffect, useState, useMemo } from "react";
import { getStorageAssets } from "../../api/infra.api";
import MainLayout from "../../layouts/MainLayout";
import { getObjectPayload } from "../../utils/api";

const panelStyle = {
  background: "linear-gradient(180deg, rgba(29,47,82,0.92) 0%, rgba(17,29,51,0.96) 100%)",
  backdropFilter: "blur(22px)",
};

export default function Servers() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("ALL");

  useEffect(() => {
    void fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await getStorageAssets();
      const payload = getObjectPayload<any>(res);
      setAssets(Array.isArray(payload.data) ? payload.data : []);
    } finally {
      setLoading(false);
    }
  };

  // Unique locations list for dynamic filters
  const locationsList = useMemo(() => {
    const set = new Set<string>();
    assets.forEach((asset) => {
      if (asset.location?.code) {
        set.add(asset.location.code);
      }
    });
    return ["ALL", ...Array.from(set)];
  }, [assets]);

  // Filtering search & location selection
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchSearch =
        asset.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.oem || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.model || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const locCode = asset.location?.code || "";
      const matchLocation = selectedLocation === "ALL" || locCode === selectedLocation;
      
      return matchSearch && matchLocation;
    });
  }, [assets, searchTerm, selectedLocation]);

  // Live Metrics Calculations
  const metrics = useMemo(() => {
    const total = filteredAssets.reduce((sum, asset) => sum + Number(asset.totalCapacityTb || 0), 0);
    const used = filteredAssets.reduce((sum, asset) => sum + Number(asset.usedCapacityTb || 0), 0);
    const allocated = filteredAssets.reduce((sum, asset) => sum + Number(asset.allocatedCapacityTb || 0), 0);
    const unused = filteredAssets.reduce((sum, asset) => sum + Number(asset.unusedCapacityTb || 0), 0);
    const stressRatio = total > 0 ? (allocated / total) * 100 : 0;
    
    return {
      total,
      used,
      allocated,
      unused,
      stressRatio,
      count: filteredAssets.length,
    };
  }, [filteredAssets]);

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Physical Storage Control Panel</h1>
          <p className="text-sm text-gray-400 mt-1">
            Browse physical disk arrays, track firmware versions, and monitor thin-provisioning indexes.
          </p>
        </div>
        <button
          onClick={() => void fetchAssets()}
          className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 text-sm font-semibold transition self-start"
        >
          Refresh Data
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading storage hardware telemetry...</div>
      ) : (
        <div className="space-y-6">
          
          {/* TOP KPI METRICS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: "Active Arrays", value: `${metrics.count} units`, desc: "Filtered physical hardware arrays" },
              { label: "Total capacity", value: `${metrics.total.toFixed(1)} TB`, desc: "Physical usable storage limit" },
              { label: "Allocated capacity", value: `${metrics.allocated.toFixed(1)} TB`, desc: "Virtual volume pool limits promised" },
              {
                label: "Thin-Provisioning Ratio",
                value: `${metrics.stressRatio.toFixed(0)}%`,
                desc: "Total stress index across these arrays",
                highlight: metrics.stressRatio >= 180 ? "text-red-400 font-extrabold" : metrics.stressRatio >= 100 ? "text-amber-400 font-extrabold" : "text-sky-400 font-extrabold",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/[0.06] p-5 shadow-sm"
                style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
              >
                <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">{item.label}</p>
                <p className={`mt-3 text-2xl font-bold tracking-tight text-white ${item.highlight || ""}`}>
                  {item.value}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* FILTERING & SEARCH PANEL */}
          <div
            className="rounded-2xl border border-white/[0.06] p-5 flex flex-col md:flex-row items-center gap-6"
            style={panelStyle}
          >
            {/* Search Input */}
            <div className="w-full md:flex-1 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search storage arrays by name, OEM, or model..."
                className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-sm focus:outline-none focus:border-indigo-500 transition placeholder:text-slate-500"
              />
              <span className="absolute right-3.5 top-3 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.604 10.604Z" />
                </svg>
              </span>
            </div>

            {/* Location Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              <span className="text-xs font-semibold text-slate-400 mr-1 uppercase tracking-wider">Location:</span>
              {locationsList.map((loc) => (
                <button
                  key={loc}
                  onClick={() => setSelectedLocation(loc)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                    selectedLocation === loc
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {loc === "ALL" ? "All Locations" : loc}
                </button>
              ))}
            </div>
          </div>

          {/* MAIN HARDWARE TABLE */}
          <div
            className="rounded-2xl border border-white/[0.06] overflow-hidden"
            style={panelStyle}
          >
            {filteredAssets.length === 0 ? (
              <div className="py-16 text-center text-slate-500 font-medium">No storage assets match the active filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900/40 border-b border-white/[0.06]">
                      <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-slate-400">Device details</th>
                      <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-slate-400">Data Center</th>
                      <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-slate-400">OEM / Model</th>
                      <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-slate-400">Total capacity</th>
                      <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-slate-400">Physical utilization</th>
                      <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-slate-400">Allocated capacity</th>
                      <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-slate-400">Unused buffer</th>
                      <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-slate-400">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredAssets.map((asset) => {
                      const totalCap = Number(asset.totalCapacityTb || 0);
                      const usedCap = Number(asset.usedCapacityTb || 0);
                      const allocatedCap = Number(asset.allocatedCapacityTb || 0);
                      const unusedCap = Number(asset.unusedCapacityTb || 0);
                      
                      const utilizationPercent = totalCap > 0 ? (usedCap / totalCap) * 100 : 0;
                      const stressRatio = totalCap > 0 ? (allocatedCap / totalCap) * 100 : 0;

                      // Condition highlights
                      const utilColor = utilizationPercent >= 85 
                        ? "bg-red-500" 
                        : utilizationPercent >= 70 
                          ? "bg-amber-500" 
                          : "bg-emerald-500";
                      
                      const stressBadge = stressRatio >= 200 
                        ? "bg-red-500/10 border-red-500/20 text-red-400" 
                        : stressRatio >= 100 
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-400" 
                          : "bg-sky-500/10 border-sky-500/20 text-sky-400";

                      return (
                        <tr key={asset.id} className="hover:bg-white/[0.02] transition">
                          {/* Device Name */}
                          <td className="px-6 py-4">
                            <p className="text-white font-semibold tracking-tight">{asset.deviceName}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Row #{asset.sourceRowNumber}</p>
                          </td>
                          
                          {/* Location Code */}
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded bg-slate-900/60 border border-white/5 text-cyan-400 font-bold uppercase text-[10px] tracking-wider">
                              {asset.location?.code || "-"}
                            </span>
                          </td>
                          
                          {/* OEM & Model */}
                          <td className="px-6 py-4">
                            <span className="text-slate-300 font-medium">{asset.oem || "-"}</span>
                            <span className="text-slate-500 block text-xs mt-0.5">{asset.model || "-"}</span>
                          </td>
                          
                          {/* Total Usable Physical Capacity */}
                          <td className="px-6 py-4 text-emerald-400 font-semibold">
                            {totalCap.toFixed(1)} TB
                          </td>
                          
                          {/* Physical Utilization Progress Bar */}
                          <td className="px-6 py-4 min-w-[150px]">
                            <div className="flex items-center justify-between text-xs mb-1 text-slate-300 font-medium">
                              <span>{usedCap.toFixed(1)} TB</span>
                              <span className="font-bold">{utilizationPercent.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                              <div className={`h-full ${utilColor} rounded-full transition-all duration-300`} style={{ width: `${Math.min(utilizationPercent, 100)}%` }} />
                            </div>
                          </td>
                          
                          {/* Allocated Space & Stress Ratio */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span className="text-slate-200 font-semibold">{allocatedCap.toFixed(1)} TB</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold border ${stressBadge}`}>
                                {stressRatio.toFixed(0)}% provision
                              </span>
                            </div>
                          </td>
                          
                          {/* Unused Buffer Capacity */}
                          <td className="px-6 py-4 text-sky-400 font-medium">
                            {unusedCap.toFixed(1)} TB
                          </td>
                          
                          {/* Remarks */}
                          <td className="px-6 py-4 text-slate-400 text-xs italic max-w-[200px] truncate" title={asset.remarks || ""}>
                            {asset.remarks || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </MainLayout>
  );
}
