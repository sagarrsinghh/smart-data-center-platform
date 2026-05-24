import { useEffect, useMemo, useState } from "react";

import MainLayout from "../../layouts/MainLayout";
import { getProjectDeployments } from "../../api/infra.api";
import { getArrayPayload, getObjectPayload } from "../../utils/api";
import MultiSelect from "../../components/common/MultiSelect";

export default function Metrics() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [filters, setFilters] = useState<{
    projects: string[];
    environments: string[];
    workloads: string[];
    locations: string[];
  }>({
    projects: [],
    environments: [],
    workloads: [],
    locations: [],
  });
  const [sortField, setSortField] = useState("project");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    void fetchDeployments();
  }, []);

  const fetchDeployments = async () => {
    try {
      setLoading(true);
      const res = await getProjectDeployments();
      const payload = getObjectPayload<any>(res);
      setRecords(Array.isArray(payload.data) ? payload.data : getArrayPayload<any>(res));
      setCount(payload.count || 0);
    } finally {
      setLoading(false);
    }
  };

  const filterOptions = useMemo(() => {
    const unique = (values: string[]) =>
      Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));

    return {
      projects: unique(records.map((item) => item.project?.displayName || "Unknown")),
      environments: unique(records.map((item) => item.environmentType)),
      workloads: unique(records.map((item) => item.workloadType)),
      locations: unique(records.map((item) => item.locationCode)),
    };
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const projectName = record.project?.displayName || "Unknown";

      return (
        (filters.projects.length === 0 || filters.projects.includes(projectName)) &&
        (filters.environments.length === 0 || filters.environments.includes(record.environmentType)) &&
        (filters.workloads.length === 0 || filters.workloads.includes(record.workloadType)) &&
        (filters.locations.length === 0 || filters.locations.includes(record.locationCode))
      );
    });
  }, [records, filters]);

  const projectGroups = useMemo(() => {
    const map = new Map<string, { rows: any[]; totalVms: number; totalCpu: number; totalRamGb: number }>();

    filteredRecords.forEach((d) => {
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

    return Array.from(map.entries())
      .map(([name, group]) => ({ name, ...group }))
      .sort((left, right) => {
        const multiplier = sortDirection === "asc" ? 1 : -1;

        if (sortField === "totalVms") {
          return (left.totalVms - right.totalVms) * multiplier;
        }

        if (sortField === "totalCpu") {
          return (left.totalCpu - right.totalCpu) * multiplier;
        }

        if (sortField === "totalRamGb") {
          return (left.totalRamGb - right.totalRamGb) * multiplier;
        }

        return left.name.localeCompare(right.name) * multiplier;
      });
  }, [filteredRecords, sortField, sortDirection]);

  const resetFilters = () => {
    setFilters({ projects: [], environments: [], workloads: [], locations: [] });
    setSortField("project");
    setSortDirection("asc");
  };

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection("asc");
  };

  const sortIcon = (field: string) => {
    if (sortField !== field) {
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 10l4-5 4 5H8zm0 4l4 5 4-5H8z" />
        </svg>
      );
    }

    return sortDirection === "asc" ? (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 15h16L12 6z" />
      </svg>
    ) : (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 9h16L12 18z" />
      </svg>
    );
  };

  const sortableHeader = (field: string, label: string, align = "left") => (
    <button
      type="button"
      onClick={() => toggleSort(field)}
      className={`flex w-full items-center gap-2 rounded-md text-xs uppercase tracking-wider transition hover:text-cyan-300 ${
        sortField === field ? "text-cyan-300" : "text-gray-400"
      } ${align === "center" ? "justify-center" : "justify-start"}`}
    >
      <span>{label}</span>
      <span
        className="ml-auto flex h-6 w-6 items-center justify-center rounded-md bg-white text-base font-black leading-none shadow-sm text-black"
      >
        {sortIcon(field)}
      </span>
    </button>
  );

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

      <div className="mb-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm text-gray-400">
              Showing <strong>{filteredRecords.length}</strong> of <strong>{count}</strong> deployment rows across <strong>{projectGroups.length}</strong> projects
            </p>
          </div>

          <div className="grid flex-1 gap-3 md:grid-cols-3 xl:max-w-[900px] xl:grid-cols-5">
            <MultiSelect
              label="Project"
              options={filterOptions.projects}
              selectedValues={filters.projects}
              onChange={(values) => setFilters((current) => ({ ...current, projects: values }))}
            />

            <MultiSelect
              label="Env"
              options={filterOptions.environments}
              selectedValues={filters.environments}
              onChange={(values) => setFilters((current) => ({ ...current, environments: values }))}
            />

            <MultiSelect
              label="Workload"
              options={filterOptions.workloads}
              selectedValues={filters.workloads}
              onChange={(values) => setFilters((current) => ({ ...current, workloads: values }))}
            />

            <MultiSelect
              label="Location"
              options={filterOptions.locations}
              selectedValues={filters.locations}
              onChange={(values) => setFilters((current) => ({ ...current, locations: values }))}
            />

            <div className="flex items-end gap-2">
              <button onClick={resetFilters} className="h-9 flex-1 rounded-lg border border-white/10 px-3 text-xs text-gray-300 hover:bg-white/5">Reset</button>
              <button onClick={() => void fetchDeployments()} className="h-9 flex-1 rounded-lg border border-white/10 px-3 text-xs text-gray-300 hover:bg-white/5">Refresh</button>
            </div>
          </div>
        </div>
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
                    <th className="px-4 py-3 text-left min-w-[180px]">{sortableHeader("project", "Project")}</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-400">Env</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-400">Loc</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-400">Workload</th>
                    {/* Row-level */}
                    <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-gray-400 bg-blue-950/20">VM Count</th>
                    <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-gray-400 bg-blue-950/20">CPU Count</th>
                    <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-gray-400 bg-blue-950/20">RAM Count</th>
                    {/* Project-level totals */}
                    <th className="px-4 py-3 text-center bg-amber-950/20">{sortableHeader("totalVms", "Total VMs", "center")}</th>
                    <th className="px-4 py-3 text-center bg-amber-950/20">{sortableHeader("totalCpu", "Total CPU", "center")}</th>
                    <th className="px-4 py-3 text-center bg-amber-950/20">{sortableHeader("totalRamGb", "Total RAM", "center")}</th>
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
