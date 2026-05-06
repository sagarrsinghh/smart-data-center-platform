import { useEffect, useState } from "react";

import { getProjectTopConsumers, getStorageSummary, getProjectSummary } from "../../api/infra.api";
import MainLayout from "../../layouts/MainLayout";
import { unwrapApiData } from "../../utils/api";

export default function Prediction() {
  const [loading, setLoading] = useState(true);
  const [consumers, setConsumers] = useState<any>({});
  const [storage, setStorage] = useState<any>({});
  const [projects, setProjects] = useState<any>({});

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

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Capacity Planning</h1>
          <p className="text-sm text-gray-400 mt-1">
            Current capacity baselines and allocations drawn from the active snapshot. (Forecasting requires multiple active snapshots)
          </p>
        </div>
        <button
          onClick={() => void fetchCapacity()}
          className="px-4 py-2 rounded-xl border border-indigo-500/30 text-indigo-400 text-sm"
        >
          Refresh Data
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading capacity metrics...</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "Platform Total CPU", value: `${Number(projects.totalCpu || 0).toFixed(1)}` },
              { label: "Platform Total RAM", value: `${Number(projects.totalRamGb || 0).toFixed(1)} GB` },
              { label: "Total Platform Storage", value: `${Number(storage.totalCapacityTb || 0).toFixed(1)} TB` },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/[0.06] p-5"
                style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
              >
                <p className="text-xs uppercase tracking-widest text-gray-400">{item.label}</p>
                <p className="mt-2 text-3xl font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
           <div
             className="rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col"
             style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
           >
             <div className="px-6 py-4 border-b border-white/[0.06]">
               <h2 className="text-base font-semibold text-white">Top 5 CPU Heavy Projects</h2>
               <p className="text-xs text-gray-500 mt-1">Projects consuming the highest amount of compute resources.</p>
             </div>
             
             <div className="overflow-x-auto flex-1 p-2">
               <table className="w-full text-sm">
                 <tbody className="divide-y divide-white/[0.04]">
                   {(consumers.topByCpu || []).map((p: any) => (
                     <tr key={p.projectId} className="hover:bg-white/[0.02]">
                       <td className="px-4 py-3 text-white">{p.projectName}</td>
                       <td className="px-4 py-3 text-cyan-400 text-right font-medium">{p.totalCpu} CPU</td>
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
             <div className="px-6 py-4 border-b border-white/[0.06]">
               <h2 className="text-base font-semibold text-white">Top 5 RAM Heavy Projects</h2>
               <p className="text-xs text-gray-500 mt-1">Projects consuming the highest amount of memory.</p>
             </div>
             
             <div className="overflow-x-auto flex-1 p-2">
               <table className="w-full text-sm">
                 <tbody className="divide-y divide-white/[0.04]">
                   {(consumers.topByRam || []).map((p: any) => (
                     <tr key={p.projectId} className="hover:bg-white/[0.02]">
                       <td className="px-4 py-3 text-white">{p.projectName}</td>
                       <td className="px-4 py-3 text-purple-400 text-right font-medium">{p.totalRamGb} GB</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
          </div>
          
          <div
             className="rounded-2xl border border-white/[0.06] overflow-hidden"
             style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
           >
             <div className="px-6 py-4 border-b border-white/[0.06]">
               <h2 className="text-base font-semibold text-white">Storage Capacity Runway</h2>
               <p className="text-xs text-gray-500 mt-1">Available buffer in existing storage locations.</p>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-sm">
                 <thead>
                   <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                     <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Location</th>
                     <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Total (TB)</th>
                     <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Used (TB)</th>
                     <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-emerald-400/80">Buffer (Unused)</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/[0.04]">
                   {(storage.locations || []).map((loc: any) => (
                     <tr key={loc.locationCode} className="hover:bg-white/[0.02]">
                       <td className="px-6 py-4 text-white font-medium">{loc.locationCode}</td>
                       <td className="px-6 py-4 text-gray-300">{loc.totalCapacityTb}</td>
                       <td className="px-6 py-4 text-amber-400 text-opacity-80">{loc.usedCapacityTb}</td>
                       <td className="px-6 py-4 text-emerald-400 font-bold">{loc.unusedCapacityTb} TB free</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
        </div>
      )}
    </MainLayout>
  );
}
