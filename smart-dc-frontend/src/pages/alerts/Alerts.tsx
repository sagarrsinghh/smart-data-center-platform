import { useEffect, useState } from "react";

import { getAlerts } from "../../api/infra.api";
import { getImportDetail, getImportStatus } from "../../api/imports.api";
import MainLayout from "../../layouts/MainLayout";
import { unwrapApiData, getObjectPayload } from "../../utils/api";

export default function Alerts() {
  const [highComputeProjects, setHighComputeProjects] = useState<any[]>([]);
  const [highStorageLocations, setHighStorageLocations] = useState<any[]>([]);
  const [importIssues, setImportIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const alertsRes = await getAlerts();
      const payload = unwrapApiData<any>(alertsRes);
      
      if (payload) {
         setHighComputeProjects(payload.highComputeProjects || []);
         setHighStorageLocations(payload.highStorageLocations || []);
      }

      const statusRes = await getImportStatus();
      const statusPayload = getObjectPayload<any>(statusRes);
      
      if (statusPayload.activeImportId) {
         const detailRes = await getImportDetail(statusPayload.activeImportId);
         const detailPayload = getObjectPayload<any>(detailRes);
         setImportIssues(detailPayload.issues || []);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Alerts</h1>
          <p className="text-sm text-gray-400 mt-1">
            Compute thresholds, storage constraints, and workbook validation issues.
          </p>
        </div>
        <button onClick={() => void fetchAlerts()} className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-gray-300">Refresh</button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading alerts...</div>
      ) : (
        <div className="space-y-6">
           <div
             className="rounded-2xl border border-white/[0.06] overflow-hidden"
             style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
           >
             <div className="px-6 py-4 border-b border-white/[0.06]">
               <h2 className="text-base font-semibold text-white">High Compute Usage (Projects)</h2>
               <p className="text-xs text-gray-500 mt-1">Projects demanding &gt;= 100 CPU cores.</p>
             </div>
             
             {highComputeProjects.length === 0 ? (
               <div className="py-8 text-center text-emerald-400/80 text-sm">No projects exceed 100 CPU cores.</div>
             ) : (
               <div className="overflow-x-auto">
                 <table className="w-full text-sm">
                   <thead>
                     <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                       <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Project</th>
                       <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Total CPU</th>
                       <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Total RAM (GB)</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/[0.04]">
                     {highComputeProjects.map((project) => (
                       <tr key={project.projectName} className="hover:bg-white/[0.02]">
                         <td className="px-6 py-4 text-white font-medium">{project.projectName}</td>
                         <td className="px-6 py-4 text-red-400 font-bold">{project.totalCpu}</td>
                         <td className="px-6 py-4 text-gray-300">{project.totalRamGb}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
           </div>

           <div
             className="rounded-2xl border border-white/[0.06] overflow-hidden"
             style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
           >
             <div className="px-6 py-4 border-b border-white/[0.06]">
               <h2 className="text-base font-semibold text-white">High Storage Usage (Locations)</h2>
               <p className="text-xs text-gray-500 mt-1">Locations surpassing 80% storage capacity.</p>
             </div>
             
             {highStorageLocations.length === 0 ? (
               <div className="py-8 text-center text-emerald-400/80 text-sm">No locations exceed 80% usage.</div>
             ) : (
               <div className="overflow-x-auto">
                 <table className="w-full text-sm">
                   <thead>
                     <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                       <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Location</th>
                       <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Used (TB)</th>
                       <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Total (TB)</th>
                       <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Utilization</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/[0.04]">
                     {highStorageLocations.map((warning) => (
                       <tr key={warning.locationCode} className="hover:bg-white/[0.02]">
                         <td className="px-6 py-4 text-white font-medium">{warning.locationCode}</td>
                         <td className="px-6 py-4 text-amber-400">{Number(warning.usedCapacityTb || 0).toFixed(2)}</td>
                         <td className="px-6 py-4 text-gray-300">{Number(warning.totalCapacityTb || 0).toFixed(2)}</td>
                         <td className="px-6 py-4">
                           <span className="text-red-400 font-bold">{warning.utilizationPercent}%</span>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
           </div>

           <div
             className="rounded-2xl border border-white/[0.06] overflow-hidden"
             style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
           >
             <div className="px-6 py-4 border-b border-white/[0.06]">
               <h2 className="text-base font-semibold text-white">Import Issues</h2>
               <p className="text-xs text-gray-500 mt-1">Validation warnings generated during the active snapshot's parsing.</p>
             </div>
             
             {importIssues.length === 0 ? (
               <div className="py-8 text-center text-emerald-400/80 text-sm">No validation issues found in active snapshot.</div>
             ) : (
               <div className="overflow-x-auto max-h-[500px]">
                 <table className="w-full text-sm">
                   <thead>
                     <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                       <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Severity</th>
                       <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Sheet</th>
                       <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Row</th>
                       <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Message</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/[0.04]">
                     {importIssues.map((issue) => (
                       <tr key={issue.id} className="hover:bg-white/[0.02]">
                         <td className="px-6 py-4 font-semibold uppercase">
                           <span className={issue.severity === 'error' ? 'text-red-400' : 'text-amber-400'}>{issue.severity}</span>
                         </td>
                         <td className="px-6 py-4 text-gray-300">{issue.sourceSheet || "-"}</td>
                         <td className="px-6 py-4 text-gray-300">{issue.sourceRowNumber || "-"}</td>
                         <td className="px-6 py-4 text-gray-300">{issue.message}</td>
                       </tr>
                     ))}
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
