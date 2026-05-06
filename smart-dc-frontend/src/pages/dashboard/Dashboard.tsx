import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getInfraDashboard } from "../../api/infra.api";
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
  right,
  className = "",
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[22px] border border-white/10 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${className}`}
      style={panelStyle}
    >
      <div className="mb-4 flex items-center justify-between border-b border-white/8 pb-3">
        <h2 className="text-[15px] font-semibold tracking-wide text-slate-100">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  colors,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  colors: string;
  icon: ReactNode;
}) {
  return (
    <div
      className={`rounded-[18px] border border-white/10 px-5 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${colors}`}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12">
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/75">{title}</p>
          <p className="mt-1 text-3xl font-semibold leading-none">{value}</p>
          <p className="mt-1 text-sm text-white/80">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);

  useEffect(() => {
    void fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await getInfraDashboard();
      setDashboard(unwrapApiData<any>(res) || null);
    } finally {
      setLoading(false);
    }
  };

  const topProjects = useMemo(
    () => (Array.isArray(dashboard?.topProjects) ? dashboard.topProjects.slice(0, 6) : []),
    [dashboard],
  );

  const storageUtilization = useMemo(
    () =>
      Array.isArray(dashboard?.storageUtilization)
        ? dashboard.storageUtilization.map((item: any) => ({
            ...item,
            fill:
              item.utilizationPercent >= 85
                ? "#df4b5f"
                : item.utilizationPercent >= 70
                  ? "#f0a144"
                  : "#52a96a",
          }))
        : [],
    [dashboard],
  );

  const workloadData = useMemo(
    () =>
      Array.isArray(dashboard?.workloadDistribution)
        ? dashboard.workloadDistribution.map((item: any, index: number) => ({
            ...item,
            fill: index === 0 ? "#63a5ff" : "#8d6df5",
          }))
        : [],
    [dashboard],
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-slate-400">
          Loading workbook dashboard...
        </div>
      </MainLayout>
    );
  }

  if (!dashboard) {
    return (
      <MainLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-slate-400">
          No active workbook snapshot found yet.
        </div>
      </MainLayout>
    );
  }

  const totals = dashboard.totals || {};
  const warnings = dashboard.warnings || {};

  return (
    <MainLayout>
      <div className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-4">
          <SummaryCard
            title="Projects"
            value={String(totals.projects || 0)}
            subtitle={`${totals.deployments || 0} deployment rows`}
            colors="bg-[linear-gradient(135deg,#8a2338,#cb4c5d)]"
            icon={<span className="text-2xl">#</span>}
          />
          <SummaryCard
            title="Total CPU"
            value={`${Number(totals.totalCpu || 0).toFixed(0)}`}
            subtitle={`${totals.totalVms || 0} VMs across the active snapshot`}
            colors="bg-[linear-gradient(135deg,#bb6a22,#f0a144)]"
            icon={<span className="text-2xl">~</span>}
          />
          <SummaryCard
            title="Total RAM"
            value={`${Number(totals.totalRamGb || 0).toFixed(0)} GB`}
            subtitle="Workbook-wide allocated memory"
            colors="bg-[linear-gradient(135deg,#2354a5,#3c79d8)]"
            icon={<span className="text-2xl">+</span>}
          />
          <SummaryCard
            title="Storage Used"
            value={`${Number(totals.usedStorageTb || 0).toFixed(1)} TB`}
            subtitle={`${Number(totals.totalStorageTb || 0).toFixed(1)} TB total capacity`}
            colors="bg-[linear-gradient(135deg,#2d7f52,#52a96a)]"
            icon={<span className="text-2xl">✓</span>}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
          <Panel title="Top Projects By CPU">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProjects} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="projectName"
                    angle={-15}
                    textAnchor="end"
                    interval={0}
                    height={65}
                    tick={{ fill: "#9eb1cf", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#0c1730",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 14,
                    }}
                  />
                  <Bar dataKey="totalCpu" radius={[8, 8, 0, 0]}>
                    {topProjects.map((item: any) => (
                      <Cell key={item.projectName} fill="#63a5ff" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Workload Split">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={workloadData}
                    dataKey="totalCpu"
                    nameKey="workloadType"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {workloadData.map((item: any) => (
                      <Cell key={item.workloadType} fill={item.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => `${Number(value || 0).toFixed(2)} CPU`}
                    contentStyle={{
                      background: "#0c1730",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 14,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {workloadData.map((item: any) => (
                <div key={item.workloadType} className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{item.workloadType}</p>
                  <p className="mt-1 text-xl font-semibold text-white">{Number(item.totalCpu || 0).toFixed(0)} CPU</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_1.2fr_0.9fr]">
          <Panel title="Location Distribution">
            <div className="space-y-3">
              {(dashboard.locationDistribution || []).map((location: any) => (
                <div key={location.locationCode} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-100">{location.locationCode}</p>
                    <p className="text-xs text-slate-500">{location.totalVms} VMs</p>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
                    <span>CPU {Number(location.totalCpu || 0).toFixed(0)}</span>
                    <span>RAM {Number(location.totalRamGb || 0).toFixed(0)} GB</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Storage Utilization By Location">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={storageUtilization} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="locationCode" tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value: any) => `${Number(value || 0).toFixed(2)}%`}
                    contentStyle={{
                      background: "#0c1730",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 14,
                    }}
                  />
                  <Bar dataKey="utilizationPercent" radius={[8, 8, 0, 0]}>
                    {storageUtilization.map((item: any) => (
                      <Cell key={item.locationCode} fill={item.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Warnings">
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Import Warnings</p>
                <p className="mt-1 text-2xl font-semibold text-white">{warnings.importWarnings || 0}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Import Errors</p>
                <p className="mt-1 text-2xl font-semibold text-white">{warnings.importErrors || 0}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Capacity Alerts</p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {Array.isArray(warnings.capacityWarnings) ? warnings.capacityWarnings.length : 0}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <p className="text-sm font-medium text-slate-100">High-utilization locations</p>
                <div className="mt-3 space-y-2">
                  {(warnings.capacityWarnings || []).slice(0, 4).map((warning: any) => (
                    <div key={warning.locationCode} className="flex items-center justify-between text-xs text-slate-300">
                      <span>{warning.locationCode}</span>
                      <span>{Number(warning.utilizationPercent || 0).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </MainLayout>
  );
}
