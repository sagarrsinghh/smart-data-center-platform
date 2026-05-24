import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";

import { getInfraDashboard, getNotifications, markNotificationRead } from "../../api/infra.api";
import MainLayout from "../../layouts/MainLayout";
import { unwrapApiData } from "../../utils/api";

const panelStyle = {
  background:
    "linear-gradient(180deg, rgba(29,47,82,0.92) 0%, rgba(17,29,51,0.96) 100%)",
  backdropFilter: "blur(22px)",
};

const formatWholeNumber = (value: unknown) => Number(value || 0).toFixed(0);
const formatPercent = (value: unknown) => `${Number(value || 0).toFixed(1)}%`;

function Panel({
  title,
  children,
  right,
  className = "",
  onZoom,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
  className?: string;
  onZoom?: () => void;
}) {
  return (
    <section
      className={`relative rounded-[22px] border border-white/10 px-5 pt-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${
        onZoom ? "pb-12" : "pb-4"
      } ${className}`}
      style={panelStyle}
    >
      <div className="mb-4 flex items-center justify-between border-b border-white/8 pb-3">
        <h2 className="text-[15px] font-semibold tracking-wide text-slate-100">{title}</h2>
        {right}
      </div>
      
      <div className="relative">
        {children}
      </div>

      {onZoom && (
        <button
          onClick={onZoom}
          className="absolute bottom-3 right-4 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/15 hover:text-white active:scale-95 shadow-sm group"
          title="Zoom and Focus Data"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 transition group-hover:scale-110"
          >
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
      )}
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

type NotificationItem = {
  id: number;
  category: string;
  severity: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

function severityClass(severity: string) {
  const normalized = severity?.toLowerCase();

  if (normalized === "critical") {
    return "border-red-400/30 bg-red-500/10 text-red-200";
  }

  if (normalized === "warning") {
    return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  }

  if (normalized === "success") {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  }

  return "border-sky-400/30 bg-sky-500/10 text-sky-200";
}

function formatNotificationTime(value: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function NotificationRail({
  notifications,
  unreadCount,
  onRefresh,
  onRead,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
  onRefresh: () => void;
  onRead: (id: number) => void;
}) {
  return (
    <aside
      className="flex h-[364px] flex-col overflow-hidden rounded-[22px] border border-white/10 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      style={panelStyle}
    >
      <div className="mb-4 flex shrink-0 items-center justify-between border-b border-white/8 pb-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-wide text-slate-100">Notifications</h2>
          <p className="mt-1 text-xs text-slate-400">{unreadCount} unread alerts</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="h-8 rounded-lg border border-white/10 px-3 text-xs font-medium text-slate-200 hover:bg-white/8"
        >
          Refresh
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {notifications.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-6 text-center text-sm text-slate-400">
            No notifications yet.
          </div>
        ) : (
          notifications.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onRead(item.id)}
              className="w-full rounded-xl border border-white/8 bg-white/[0.035] px-4 py-3 text-left transition hover:border-white/16 hover:bg-white/[0.055]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!item.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" />}
                    <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-300">{item.message}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${severityClass(item.severity)}`}>
                  {item.severity}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-slate-500">
                <span>{item.category}</span>
                <span>{formatNotificationTime(item.createdAt)}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Zoom feature state
  const [zoomedChart, setZoomedChart] = useState<"top_projects" | "env_cpu" | "location_storage" | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setZoomedChart(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    void fetchDashboard();
    void fetchNotifications();

    const interval = window.setInterval(() => {
      void fetchNotifications();
    }, 30000);

    return () => window.clearInterval(interval);
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

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications(12);
      const payload = unwrapApiData<any>(res) || {};
      setNotifications(Array.isArray(payload.data) ? payload.data : []);
      setUnreadCount(Number(payload.unreadCount || 0));
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const handleNotificationRead = async (id: number) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
    );
    setUnreadCount((current) => Math.max(current - 1, 0));

    try {
      await markNotificationRead(id);
    } finally {
      void fetchNotifications();
    }
  };

  const topProjects = useMemo(
    () =>
      Array.isArray(dashboard?.topProjects)
        ? dashboard.topProjects.slice(0, 6).map((item: any) => ({
            ...item,
            cpuUsage: Number(item.cpuUsage ?? item.totalCpu ?? 0),
          }))
        : [],
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

  const environmentData = useMemo(
    () =>
      Array.isArray(dashboard?.environmentDistribution)
        ? dashboard.environmentDistribution
            .map((item: any) => ({
              ...item,
              cpuUsage: Number(item.cpuUsage ?? item.totalCpu ?? 0),
            }))
            .sort((left: any, right: any) => right.cpuUsage - left.cpuUsage)
        : [],
    [dashboard],
  );

  const zoomedChartInfo = useMemo(() => {
    if (!zoomedChart || !dashboard) return null;

    let title = "";
    let peak = "";
    let latest = "";
    const tableRows: any[] = [];

    if (zoomedChart === "top_projects") {
      title = "Top Projects By CPU Usage";
      const totalCpuVal = topProjects.reduce((sum: number, item: any) => sum + Number(item.cpuUsage || 0), 0);
      const values = topProjects.map((item: any) => Number(item.cpuUsage || 0));
      const peakVal = values.length > 0 ? Math.max(...values) : 0;
      const peakProj = topProjects.find((item: any) => Number(item.cpuUsage || 0) === peakVal);

      peak = peakProj ? `${peakProj.projectName} (${peakVal.toFixed(1)} Cores)` : "-";
      latest = `${totalCpuVal.toFixed(1)} Cores (Total)`;

      topProjects.forEach((item: any) => {
        const val = Number(item.cpuUsage || 0);
        const percent = totalCpuVal > 0 ? (val / totalCpuVal) * 100 : 0;
        tableRows.push({
          label: item.projectName,
          value: `${val.toFixed(1)} Cores`,
          pct: percent,
          statusText: `${percent.toFixed(1)}%`,
        });
      });
    } else if (zoomedChart === "env_cpu") {
      title = "Environment CPU Distribution";
      const totalCpuVal = environmentData.reduce((sum: number, item: any) => sum + Number(item.cpuUsage || 0), 0);
      const values = environmentData.map((item: any) => Number(item.cpuUsage || 0));
      const peakVal = values.length > 0 ? Math.max(...values) : 0;
      const peakEnv = environmentData.find((item: any) => Number(item.cpuUsage || 0) === peakVal);

      peak = peakEnv ? `${peakEnv.environmentType} (${peakVal.toFixed(1)} Cores)` : "-";
      latest = `${totalCpuVal.toFixed(1)} Cores (Total)`;

      environmentData.forEach((item: any) => {
        const val = Number(item.cpuUsage || 0);
        const percent = totalCpuVal > 0 ? (val / totalCpuVal) * 100 : 0;
        tableRows.push({
          label: item.environmentType,
          value: `${val.toFixed(2)} Cores`,
          pct: percent,
          statusText: `${percent.toFixed(1)}%`,
        });
      });
    } else if (zoomedChart === "location_storage") {
      title = "Storage Utilization By Location";
      const values = storageUtilization.map((item: any) => Number(item.utilizationPercent || 0));
      const peakVal = values.length > 0 ? Math.max(...values) : 0;
      const peakLoc = storageUtilization.find((item: any) => Number(item.utilizationPercent || 0) === peakVal);

      peak = peakLoc ? `${peakLoc.locationCode} (${peakVal.toFixed(1)}%)` : "-";
      latest = `${storageUtilization.length} Locations`;

      storageUtilization.forEach((item: any) => {
        const val = Number(item.utilizationPercent || 0);
        const status = val >= 85 ? "Critical" : val >= 70 ? "Warning" : "Healthy";
        tableRows.push({
          label: item.locationCode,
          value: `${val.toFixed(1)}%`,
          pct: val,
          statusText: status,
        });
      });
    }

    return { title, peak, latest, tableRows };
  }, [zoomedChart, dashboard, topProjects, environmentData, storageUtilization]);

  const renderZoomedChart = () => {
    if (!zoomedChart || !dashboard) return null;

    if (zoomedChart === "top_projects") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topProjects} margin={{ top: 30, right: 20, left: -10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="projectName"
              angle={-20}
              textAnchor="end"
              interval={0}
              height={75}
              tick={{ fill: "#9eb1cf", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fill: "#9eb1cf", fontSize: 13 }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value: any) => [`${Number(value).toFixed(1)} Cores`, "CPU Usage"]}
              contentStyle={{
                background: "#0c1730",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 16,
                fontSize: 14,
              }}
            />
            <Bar dataKey="cpuUsage" name="CPU Usage" radius={[10, 10, 0, 0]}>
              <LabelList
                dataKey="cpuUsage"
                position="top"
                formatter={(v: any) => Number(v).toFixed(1)}
                fill="#dbeafe"
                fontSize={12}
                fontWeight={700}
              />
              {topProjects.map((item: any) => (
                <Cell key={item.projectName} fill="#63a5ff" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (zoomedChart === "env_cpu") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={environmentData} layout="vertical" margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis type="number" tick={{ fill: "#9eb1cf", fontSize: 13 }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="environmentType"
              width={70}
              tick={{ fill: "#9eb1cf", fontSize: 13 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: any) => [`${Number(value || 0).toFixed(2)} Cores`, "CPU Usage"]}
              contentStyle={{
                background: "#0c1730",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 16,
                fontSize: 14,
              }}
            />
            <Bar dataKey="cpuUsage" name="CPU Usage" radius={[0, 10, 10, 0]}>
              <LabelList
                dataKey="cpuUsage"
                position="right"
                formatter={(v: any) => Number(v).toFixed(1)}
                fill="#dbeafe"
                fontSize={12}
                fontWeight={700}
              />
              {environmentData.map((item: any, index: number) => (
                <Cell
                  key={item.environmentType}
                  fill={index === 0 ? "#63a5ff" : index === 1 ? "#52a96a" : "#f0a144"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (zoomedChart === "location_storage") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={storageUtilization} margin={{ top: 30, right: 20, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="locationCode" tick={{ fill: "#9eb1cf", fontSize: 13 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: "#9eb1cf", fontSize: 13 }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value: any) => [`${Number(value || 0).toFixed(1)}%`, "Utilization"]}
              contentStyle={{
                background: "#0c1730",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 16,
                fontSize: 14,
              }}
            />
            <ReferenceLine
              y={85}
              stroke="#df4b5f"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: "Critical Limit (85%)",
                fill: "#df4b5f",
                fontSize: 12,
                position: "top",
                fontWeight: "bold",
              }}
            />
            <Bar dataKey="utilizationPercent" radius={[10, 10, 0, 0]}>
              <LabelList
                dataKey="utilizationPercent"
                position="top"
                formatter={(v: any) => `${Number(v).toFixed(1)}%`}
                fill="#dbeafe"
                fontSize={12}
                fontWeight={700}
              />
              {storageUtilization.map((item: any) => (
                <Cell key={item.locationCode} fill={item.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

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

  return (
    <MainLayout>
      <div className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-5">
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
            title="Total VMs"
            value={`${Number(totals.totalVms || 0).toFixed(0)}`}
            subtitle="VMs across active snapshot"
            colors="bg-[linear-gradient(135deg,#4b327d,#8064d8)]"
            icon={<span className="text-2xl">VM</span>}
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

        <div className="grid gap-5 xl:grid-cols-[1.18fr_0.9fr_360px]">
          <Panel title="Top Projects By CPU Usage" onZoom={() => setZoomedChart("top_projects")}>
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
                  <Bar dataKey="cpuUsage" name="CPU Usage" radius={[8, 8, 0, 0]}>
                    <LabelList
                      dataKey="cpuUsage"
                      position="top"
                      formatter={formatWholeNumber}
                      fill="#dbeafe"
                      fontSize={11}
                      fontWeight={700}
                    />
                    {topProjects.map((item: any) => (
                      <Cell key={item.projectName} fill="#63a5ff" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Environment CPU Usage" onZoom={() => setZoomedChart("env_cpu")}>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={environmentData} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis type="number" tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="environmentType"
                    width={54}
                    tick={{ fill: "#9eb1cf", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: any) => `${Number(value || 0).toFixed(2)} CPU Usage`}
                    contentStyle={{
                      background: "#0c1730",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 14,
                    }}
                  />
                  <Bar dataKey="cpuUsage" name="CPU Usage" radius={[0, 8, 8, 0]}>
                    <LabelList
                      dataKey="cpuUsage"
                      position="right"
                      formatter={formatWholeNumber}
                      fill="#dbeafe"
                      fontSize={11}
                      fontWeight={700}
                    />
                    {environmentData.map((item: any, index: number) => (
                      <Cell
                        key={item.environmentType}
                        fill={index === 0 ? "#63a5ff" : index === 1 ? "#52a96a" : "#f0a144"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <NotificationRail
            notifications={notifications}
            unreadCount={unreadCount}
            onRefresh={() => void fetchNotifications()}
            onRead={(id) => void handleNotificationRead(id)}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.45fr]">
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

          <Panel title="Storage Utilization By Location" onZoom={() => setZoomedChart("location_storage")}>
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
                    <LabelList
                      dataKey="utilizationPercent"
                      position="top"
                      formatter={formatPercent}
                      fill="#dbeafe"
                      fontSize={11}
                      fontWeight={700}
                    />
                    {storageUtilization.map((item: any) => (
                      <Cell key={item.locationCode} fill={item.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>

      {/* Zoom Modal Overlay */}
      {zoomedChart && zoomedChartInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 md:p-8 backdrop-blur-xl animate-fade-in"
          onClick={() => setZoomedChart(null)}
        >
          {/* Modal Container */}
          <div
            className="relative flex h-[85vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-white/10 shadow-2xl backdrop-blur-2xl md:flex-row animate-zoom-in"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(135deg, rgba(15,23,42,0.45) 0%, rgba(30,41,59,0.4) 100%)",
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setZoomedChart(null)}
              className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/15 hover:text-white active:scale-95 shadow-sm"
              title="Close Modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Left Side: Dynamic Interactive Recharts Graph */}
            <div className="flex flex-1 flex-col p-6 md:p-8 min-w-0">
              <div className="mb-4">
                <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  HD Focus View
                </span>
                <h3 className="mt-2 text-xl font-bold text-white tracking-tight">{zoomedChartInfo.title}</h3>
              </div>
              <div className="flex-1 min-h-0 bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex items-center justify-center">
                {renderZoomedChart()}
              </div>
            </div>

            {/* Right Side: Operational Stats & Breakdown Table */}
            <div className="w-full border-t border-white/10 bg-slate-950/30 p-6 md:w-[400px] md:border-t-0 md:border-l flex flex-col md:p-8 shrink-0">
              <div className="mb-6">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Operational Focus</h4>
                <p className="mt-1 text-xs text-slate-500">Resource distribution analytics.</p>
              </div>

              {/* Grid Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="text-xs text-slate-400 font-medium">Peak Resource</p>
                  <p className="mt-1.5 text-[13px] font-bold text-amber-400 tracking-tight leading-snug break-words">{zoomedChartInfo.peak}</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="text-xs text-slate-400 font-medium">Metric Cap</p>
                  <p className="mt-1.5 text-sm font-bold text-cyan-400 tracking-tight leading-snug break-words">{zoomedChartInfo.latest}</p>
                </div>
              </div>

              {/* Resource Breakdown list */}
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Detailed Allocation</span>
                  <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-400">Ranked Breakdown</span>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-0">
                  {zoomedChartInfo.tableRows.map((row: any, i: number) => {
                    const isCritical = row.statusText === "Critical";
                    const isWarning = row.statusText === "Warning";
                    const isHealthy = row.statusText === "Healthy";
                    return (
                      <div
                        key={i}
                        className="flex flex-col rounded-xl border border-white/[0.04] bg-white/[0.015] px-4 py-3 hover:bg-white/[0.03] transition"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-200">{row.label}</p>
                          <p className="text-xs font-bold text-white font-mono">{row.value}</p>
                        </div>
                        
                        {/* Progress Bar / Indicator */}
                        <div className="mt-2 flex items-center gap-3">
                          <div className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isCritical
                                  ? "bg-red-500"
                                  : isWarning
                                  ? "bg-amber-500"
                                  : isHealthy
                                  ? "bg-emerald-500"
                                  : "bg-cyan-500"
                              }`}
                              style={{ width: `${Math.min(100, row.pct)}%` }}
                            />
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold ${
                              isCritical
                                ? "bg-red-500/10 text-red-400"
                                : isWarning
                                ? "bg-amber-500/10 text-amber-400"
                                : isHealthy
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-cyan-500/10 text-cyan-400"
                            }`}
                          >
                            {row.statusText}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded High-Fidelity Custom Styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoomIn {
          from { transform: scale(0.97); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-zoom-in {
          animation: zoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </MainLayout>
  );
}
