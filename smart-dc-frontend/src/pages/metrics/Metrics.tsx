import { useEffect, useMemo, useState } from "react";

import MainLayout from "../../layouts/MainLayout";
import { getProjectDeployments } from "../../api/infra.api";
import { getArrayPayload, getObjectPayload } from "../../utils/api";

export default function Metrics() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const filters = { environment: "", location: "", workload: "", project: "" };

  useEffect(() => {
    void fetchDeployments(filters);
  }, []);

  const fetchDeployments = async (nextFilters = filters) => {
    try {
      setLoading(true);
      const cleanFilters = Object.fromEntries(
        Object.entries(nextFilters).filter(([, v]) => v !== "" && v !== "all")
      );
      const res = await getProjectDeployments(cleanFilters);
      const payload = getObjectPayload<any>(res);
      setRecords(Array.isArray(payload.data) ? payload.data : getArrayPayload<any>(res));
      setCount(payload.count || 0);
    } finally {
      setLoading(false);
    }
  };

  // Group deployments by project name, and compute project-level totals
  const projectGroups = useMemo(() => {
    const map = new Map<string, { rows: any[]; totalVms: number; totalCpu: number; totalRamGb: number }>();

    records.forEach((d) => {
      const name = d.project?.displayName || "Unknown";
      if (!map.has(name)) {
        map.set(name, { rows: [], totalVms: 0, totalCpu: 0, totalRamGb: 0 });
      }
      const group = map.get(name)!;
      group.rows.push(d);
      // Sum project-level totals only on rows where totalVms/totalCpu/totalRamGb are set
      group.totalVms += Number(d.totalVms || 0);
      group.totalCpu += Number(d.totalCpu || 0);
      group.totalRamGb += Number(d.totalRamGb || 0);
    });

    return Array.from(map.entries()).map(([name, group]) => ({ name, ...group }));
  }, [records]);

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Project Deployments</h1>
          <p className="text-sm text-gray-400 mt-1">
            Project-wise deployment records mapping VMs, CPUs, and RAM — row level and project totals.
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-white/[0.06] p-4 bg-white/[0.02] flex items-center justify-between">
        <p className="text-sm text-gray-400">Showing <strong>{count}</strong> deployment rows across <strong>{projectGroups.length}</strong> projects</p>
        <button onClick={() => void fetchDeployments(filters)} className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5">Refresh</button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading project deployments...</div>
      ) : (
        <div
          className="rounded-2xl border border-white/[0.06] overflow-hidden"
          style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
        >
          {projectGroups.length === 0 ? (
            <div className="py-16 text-center text-gray-500">No project deployments found. Please import a workbook first.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-white/[0.03] border-b border-white/[0.08]">
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-400 min-w-[180px]">Project</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-400">Env</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-400">Loc</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-400">Workload</th>
                    {/* Row-level */}
                    <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-gray-400 bg-blue-950/20">VM Count</th>
                    <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-gray-400 bg-blue-950/20">CPU Count</th>
                    <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-gray-400 bg-blue-950/20">RAM Count</th>
                    {/* Project-level totals */}
                    <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-amber-400/70 bg-amber-950/20">Total VMs</th>
                    <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-amber-400/70 bg-amber-950/20">Total CPU</th>
                    <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-amber-400/70 bg-amber-950/20">Total RAM</th>
                  </tr>
                </thead>
                <tbody>
                  {projectGroups.map((group) =>
                    group.rows.map((d, ri) => (
                      <tr
                        key={d.id}
                        className={`border-b border-white/[0.04] hover:bg-white/[0.02] ${ri === 0 ? "border-t border-white/[0.08]" : ""}`}
                      >
                        {/* Project name — merged with rowspan */}
                        {ri === 0 && (
                          <td
                            rowSpan={group.rows.length}
                            className="px-4 py-3 text-white font-semibold whitespace-nowrap align-middle border-r border-white/[0.06]"
                            style={{ background: "rgba(255,255,255,0.02)" }}
                          >
                            <span className="text-sm">{group.name}</span>
                          </td>
                        )}

                        {/* Per-row: Env, Loc, Workload */}
                        <td className="px-4 py-3 text-cyan-400 text-xs font-medium">{d.environmentType}</td>
                        <td className="px-4 py-3 text-emerald-400 text-xs font-mono">{d.locationCode}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.workloadType === "APP" ? "bg-purple-500/15 text-purple-300" : "bg-sky-500/15 text-sky-300"}`}>
                            {d.workloadType}
                          </span>
                        </td>

                        {/* Per-row numeric values */}
                        <td className="px-4 py-3 text-center text-gray-200 bg-blue-950/10">{d.vmQuantity != null ? d.vmQuantity : "-"}</td>
                        <td className="px-4 py-3 text-center text-blue-300 bg-blue-950/10">{d.core != null ? d.core : "-"}</td>
                        <td className="px-4 py-3 text-center text-indigo-300 bg-blue-950/10">{d.ramGb != null ? `${d.ramGb} GB` : "-"}</td>

                        {/* Project totals — merged with rowspan, shown only on first row */}
                        {ri === 0 && (
                          <>
                            <td
                              rowSpan={group.rows.length}
                              className="px-4 py-3 text-center align-middle bg-amber-950/10 border-l border-amber-500/10"
                            >
                              <span className="text-amber-300 font-bold text-base">
                                {group.totalVms > 0 ? group.totalVms : "-"}
                              </span>
                            </td>
                            <td
                              rowSpan={group.rows.length}
                              className="px-4 py-3 text-center align-middle bg-amber-950/10"
                            >
                              <span className="text-amber-400 font-bold text-base">
                                {group.totalCpu > 0 ? group.totalCpu.toFixed(1) : "-"}
                              </span>
                            </td>
                            <td
                              rowSpan={group.rows.length}
                              className="px-4 py-3 text-center align-middle bg-amber-950/10"
                            >
                              <span className="text-orange-400 font-bold text-base">
                                {group.totalRamGb > 0 ? `${group.totalRamGb.toFixed(1)} GB` : "-"}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                 </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </MainLayout>
  );
}
