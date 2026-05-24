import { useEffect, useState, useMemo } from "react";
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
  ReferenceLine,
} from "recharts";

import { getComputeTrends, getStorageTrends } from "../../api/infra.api";
import MainLayout from "../../layouts/MainLayout";
import { unwrapApiData } from "../../utils/api";
import MultiSelect from "../../components/common/MultiSelect";

const panelStyle = {
  background:
    "linear-gradient(180deg, rgba(29,47,82,0.92) 0%, rgba(17,29,51,0.96) 100%)",
  backdropFilter: "blur(22px)",
};

function Panel({
  title,
  children,
  className = "",
  onZoom,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  onZoom?: () => void;
}) {
  return (
    <section
      className={`relative rounded-[22px] border border-white/10 px-5 pt-4 pb-12 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${className}`}
      style={panelStyle}
    >
      <div className="mb-4 border-b border-white/8 pb-3">
        <h2 className="text-[15px] font-semibold tracking-wide text-slate-100">{title}</h2>
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

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [computeTrends, setComputeTrends] = useState<any[]>([]);
  const [storageTrends, setStorageTrends] = useState<any[]>([]);

  // Zoom feature state
  const [zoomedChart, setZoomedChart] = useState<"vm" | "cpu" | "ram" | "storage_util" | "storage_cap" | null>(null);

  // Custom Comparison Mode states
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  useEffect(() => {
    void fetchAnalytics();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setZoomedChart(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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

  // Derive all available snapshots chronologically
  const allAvailableMonths = useMemo(() => {
    return computeTrends.map((item) => item.month);
  }, [computeTrends]);

  // Auto-initialize selected snapshots to the latest two when entering Comparison Mode
  useEffect(() => {
    if (isComparisonMode && selectedMonths.length === 0 && allAvailableMonths.length >= 2) {
      setSelectedMonths([
        allAvailableMonths[allAvailableMonths.length - 2],
        allAvailableMonths[allAvailableMonths.length - 1],
      ]);
    }
  }, [isComparisonMode, allAvailableMonths, selectedMonths]);

  // Derive used vs free storage capacity for stacked bar display
  const processedStorageTrends = useMemo(() => {
    return storageTrends.map((item) => {
      const total = Number(item.totalCapacityTb || 0);
      const used = Number(item.usedCapacityTb || 0);
      return {
        ...item,
        freeCapacityTb: Math.max(0, total - used),
      };
    });
  }, [storageTrends]);

  // Filter datasets based on active comparison snapshots
  const filteredComputeTrends = useMemo(() => {
    if (!isComparisonMode || selectedMonths.length === 0) return computeTrends;
    return computeTrends.filter((item) => selectedMonths.includes(item.month));
  }, [computeTrends, isComparisonMode, selectedMonths]);

  const filteredStorageTrends = useMemo(() => {
    if (!isComparisonMode || selectedMonths.length === 0) return processedStorageTrends;
    return processedStorageTrends.filter((item) => selectedMonths.includes(item.month));
  }, [processedStorageTrends, isComparisonMode, selectedMonths]);

  // Compute stats and historical list rows for the focused zoom view
  const zoomedChartInfo = useMemo(() => {
    if (!zoomedChart) return null;

    let title = "";
    let peak = "";
    let latest = "";
    const tableRows: any[] = [];

    if (zoomedChart === "vm") {
      title = "Month-Over-Month VM Growth";
      const values = filteredComputeTrends.map((item) => Number(item.totalProjectVms || 0));
      const peakVal = values.length > 0 ? Math.max(...values) : 0;
      const latestVal = filteredComputeTrends.length > 0 ? filteredComputeTrends[filteredComputeTrends.length - 1].totalProjectVms : 0;

      peak = `${peakVal} VMs`;
      latest = `${latestVal} VMs`;

      filteredComputeTrends.forEach((item, index) => {
        const val = Number(item.totalProjectVms || 0);
        let change = 0;
        let changeText = "-";
        if (index > 0) {
          const prevVal = Number(filteredComputeTrends[index - 1].totalProjectVms || 0);
          change = val - prevVal;
          changeText = change > 0 ? `+${change}` : change < 0 ? `${change}` : "0";
        }
        tableRows.push({
          month: item.month,
          value: `${val} VMs`,
          change,
          changeText,
        });
      });
    } else if (zoomedChart === "cpu") {
      title = "Month-Over-Month CPU Growth (Cores)";
      const values = filteredComputeTrends.map((item) => Number(item.totalProjectCpu || 0));
      const peakVal = values.length > 0 ? Math.max(...values) : 0;
      const latestVal = filteredComputeTrends.length > 0 ? filteredComputeTrends[filteredComputeTrends.length - 1].totalProjectCpu : 0;

      peak = `${peakVal.toFixed(1)} Cores`;
      latest = `${latestVal.toFixed(1)} Cores`;

      filteredComputeTrends.forEach((item, index) => {
        const val = Number(item.totalProjectCpu || 0);
        let change = 0;
        let changeText = "-";
        if (index > 0) {
          const prevVal = Number(filteredComputeTrends[index - 1].totalProjectCpu || 0);
          change = val - prevVal;
          changeText = change > 0 ? `+${change.toFixed(1)}` : change < 0 ? `${change.toFixed(1)}` : "0";
        }
        tableRows.push({
          month: item.month,
          value: `${val.toFixed(1)} Cores`,
          change,
          changeText,
        });
      });
    } else if (zoomedChart === "ram") {
      title = "Month-Over-Month RAM Growth (GB)";
      const values = filteredComputeTrends.map((item) => Number(item.totalProjectRamGb || 0));
      const peakVal = values.length > 0 ? Math.max(...values) : 0;
      const latestVal = filteredComputeTrends.length > 0 ? filteredComputeTrends[filteredComputeTrends.length - 1].totalProjectRamGb : 0;

      peak = `${peakVal.toFixed(1)} GB`;
      latest = `${latestVal.toFixed(1)} GB`;

      filteredComputeTrends.forEach((item, index) => {
        const val = Number(item.totalProjectRamGb || 0);
        let change = 0;
        let changeText = "-";
        if (index > 0) {
          const prevVal = Number(filteredComputeTrends[index - 1].totalProjectRamGb || 0);
          change = val - prevVal;
          changeText = change > 0 ? `+${change.toFixed(0)} GB` : change < 0 ? `${change.toFixed(0)} GB` : "0";
        }
        tableRows.push({
          month: item.month,
          value: `${val.toFixed(1)} GB`,
          change,
          changeText,
        });
      });
    } else if (zoomedChart === "storage_util") {
      title = "Storage Utilization Trend (%)";
      const values = filteredStorageTrends.map((item) => Number(item.utilizationPercent || 0));
      const peakVal = values.length > 0 ? Math.max(...values) : 0;
      const latestVal = filteredStorageTrends.length > 0 ? filteredStorageTrends[filteredStorageTrends.length - 1].utilizationPercent : 0;

      peak = `${peakVal.toFixed(1)}%`;
      latest = `${latestVal.toFixed(1)}%`;

      filteredStorageTrends.forEach((item, index) => {
        const val = Number(item.utilizationPercent || 0);
        let change = 0;
        let changeText = "-";
        if (index > 0) {
          const prevVal = Number(filteredStorageTrends[index - 1].utilizationPercent || 0);
          change = val - prevVal;
          changeText = change > 0 ? `+${change.toFixed(1)}%` : change < 0 ? `${change.toFixed(1)}%` : "0";
        }
        tableRows.push({
          month: item.month,
          value: `${val.toFixed(1)}%`,
          change,
          changeText,
        });
      });
    } else if (zoomedChart === "storage_cap") {
      title = "Storage Capacity Allocation (TB)";
      const values = filteredStorageTrends.map((item) => Number(item.totalCapacityTb || 0));
      const peakVal = values.length > 0 ? Math.max(...values) : 0;
      const latestVal = filteredStorageTrends.length > 0 ? filteredStorageTrends[filteredStorageTrends.length - 1].totalCapacityTb : 0;

      peak = `${peakVal.toFixed(1)} TB`;
      latest = `${latestVal.toFixed(1)} TB`;

      filteredStorageTrends.forEach((item, index) => {
        const cap = Number(item.totalCapacityTb || 0);
        const used = Number(item.usedCapacityTb || 0);
        let change = 0;
        let changeText = "-";
        if (index > 0) {
          const prevCap = Number(filteredStorageTrends[index - 1].totalCapacityTb || 0);
          change = cap - prevCap;
          changeText = change > 0 ? `+${change.toFixed(1)} TB` : change < 0 ? `${change.toFixed(1)} TB` : "0";
        }
        tableRows.push({
          month: item.month,
          value: `Used: ${used.toFixed(1)} / Total: ${cap.toFixed(1)} TB`,
          change,
          changeText,
        });
      });
    }

    // Sort rows newest first for the table listing
    tableRows.reverse();

    return { title, peak, latest, tableRows };
  }, [zoomedChart, filteredComputeTrends, filteredStorageTrends]);

  // Compute comparison delta stats for the comparison metrics grid
  const comparisonDeltas = useMemo(() => {
    if (!isComparisonMode || selectedMonths.length < 2) return null;

    // Sort selected months according to their chronological order in allAvailableMonths
    const sortedSelected = [...selectedMonths].sort(
      (a, b) => allAvailableMonths.indexOf(a) - allAvailableMonths.indexOf(b)
    );

    const baselineMonth = sortedSelected[0];
    const targetMonth = sortedSelected[sortedSelected.length - 1];

    const baselineCompute = computeTrends.find((item) => item.month === baselineMonth);
    const targetCompute = computeTrends.find((item) => item.month === targetMonth);

    const baselineStorage = processedStorageTrends.find((item) => item.month === baselineMonth);
    const targetStorage = processedStorageTrends.find((item) => item.month === targetMonth);

    if (!baselineCompute || !targetCompute || !baselineStorage || !targetStorage) return null;

    // VMs
    const vmDiff = Number(targetCompute.totalProjectVms || 0) - Number(baselineCompute.totalProjectVms || 0);
    const vmPct = Number(baselineCompute.totalProjectVms || 0) > 0 ? (vmDiff / Number(baselineCompute.totalProjectVms || 0)) * 100 : 0;

    // CPU
    const cpuDiff = Number(targetCompute.totalProjectCpu || 0) - Number(baselineCompute.totalProjectCpu || 0);
    const cpuPct = Number(baselineCompute.totalProjectCpu || 0) > 0 ? (cpuDiff / Number(baselineCompute.totalProjectCpu || 0)) * 100 : 0;

    // RAM
    const ramDiff = Number(targetCompute.totalProjectRamGb || 0) - Number(baselineCompute.totalProjectRamGb || 0);
    const ramPct = Number(baselineCompute.totalProjectRamGb || 0) > 0 ? (ramDiff / Number(baselineCompute.totalProjectRamGb || 0)) * 100 : 0;

    // Storage Utilization (Absolute difference in %)
    const utilDiff = Number(targetStorage.utilizationPercent || 0) - Number(baselineStorage.utilizationPercent || 0);

    // Total Storage Capacity
    const capDiff = Number(targetStorage.totalCapacityTb || 0) - Number(baselineStorage.totalCapacityTb || 0);
    const capPct = Number(baselineStorage.totalCapacityTb || 0) > 0 ? (capDiff / Number(baselineStorage.totalCapacityTb || 0)) * 100 : 0;

    return {
      baselineMonth,
      targetMonth,
      vms: { diff: vmDiff, pct: vmPct, targetVal: targetCompute.totalProjectVms },
      cpu: { diff: cpuDiff, pct: cpuPct, targetVal: targetCompute.totalProjectCpu },
      ram: { diff: ramDiff, pct: ramPct, targetVal: targetCompute.totalProjectRamGb },
      utilization: { diff: utilDiff, targetVal: targetStorage.utilizationPercent },
      capacity: { diff: capDiff, pct: capPct, targetVal: targetStorage.totalCapacityTb },
    };
  }, [isComparisonMode, selectedMonths, allAvailableMonths, computeTrends, processedStorageTrends]);

  // High-fidelity full screen chart rendering
  const renderZoomedChart = () => {
    if (!zoomedChart) return null;

    if (zoomedChart === "vm") {
      if (isComparisonMode) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredComputeTrends} margin={{ top: 30, right: 20, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fill: "#9eb1cf", fontSize: 13 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9eb1cf", fontSize: 13 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: any) => [`${value} VMs`, "Total VMs"]}
                contentStyle={{
                  background: "#0c1730",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 16,
                  fontSize: 14,
                }}
              />
              <Bar
                dataKey="totalProjectVms"
                name="Total VMs"
                fill="#2dd4bf"
                radius={[8, 8, 0, 0]}
                label={(props: any) => {
                  const { x, y, width, value } = props;
                  if (value === undefined || value === null) return null;
                  return (
                    <text
                      x={x + width / 2}
                      y={y - 8}
                      fill="#2dd4bf"
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight="bold"
                    >
                      {value}
                    </text>
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      }
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredComputeTrends} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
            <defs>
              <linearGradient id="zoomVmColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="month" tick={{ fill: "#9eb1cf", fontSize: 13 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#9eb1cf", fontSize: 13 }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value: any) => [`${value} VMs`, "Total VMs"]}
              contentStyle={{
                background: "#0c1730",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 16,
                fontSize: 14,
              }}
            />
            <Area
              type="monotone"
              dataKey="totalProjectVms"
              name="Total VMs"
              stroke="#2dd4bf"
              strokeWidth={4}
              fillOpacity={1}
              fill="url(#zoomVmColor)"
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (zoomedChart === "cpu") {
      if (isComparisonMode) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredComputeTrends} margin={{ top: 30, right: 20, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fill: "#9eb1cf", fontSize: 13 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9eb1cf", fontSize: 13 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: any) => [`${value.toFixed(1)} Cores`, "Total CPU"]}
                contentStyle={{
                  background: "#0c1730",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 16,
                  fontSize: 14,
                }}
              />
              <Bar
                dataKey="totalProjectCpu"
                name="Total CPU (Project)"
                fill="#3b82f6"
                radius={[8, 8, 0, 0]}
                label={(props: any) => {
                  const { x, y, width, value } = props;
                  if (value === undefined || value === null) return null;
                  return (
                    <text
                      x={x + width / 2}
                      y={y - 8}
                      fill="#3b82f6"
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight="bold"
                    >
                      {Number(value).toFixed(1)}
                    </text>
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      }
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredComputeTrends} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
            <defs>
              <linearGradient id="zoomCpuColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="month" tick={{ fill: "#9eb1cf", fontSize: 13 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#9eb1cf", fontSize: 13 }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value: any) => [`${value} Cores`, "Total CPU"]}
              contentStyle={{
                background: "#0c1730",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 16,
                fontSize: 14,
              }}
            />
            <Area
              type="monotone"
              dataKey="totalProjectCpu"
              name="Total CPU (Project)"
              stroke="#3b82f6"
              strokeWidth={4}
              fillOpacity={1}
              fill="url(#zoomCpuColor)"
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (zoomedChart === "ram") {
      if (isComparisonMode) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredComputeTrends} margin={{ top: 30, right: 20, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fill: "#9eb1cf", fontSize: 13 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9eb1cf", fontSize: 13 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: any) => [`${value.toFixed(1)} GB`, "Total RAM"]}
                contentStyle={{
                  background: "#0c1730",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 16,
                  fontSize: 14,
                }}
              />
              <Bar
                dataKey="totalProjectRamGb"
                name="Total RAM (GB)"
                fill="#8d6df5"
                radius={[8, 8, 0, 0]}
                label={(props: any) => {
                  const { x, y, width, value } = props;
                  if (value === undefined || value === null) return null;
                  return (
                    <text
                      x={x + width / 2}
                      y={y - 8}
                      fill="#8d6df5"
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight="bold"
                    >
                      {`${Number(value).toFixed(0)} GB`}
                    </text>
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      }
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredComputeTrends} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
            <defs>
              <linearGradient id="zoomRamColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8d6df5" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#8d6df5" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="month" tick={{ fill: "#9eb1cf", fontSize: 13 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#9eb1cf", fontSize: 13 }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value: any) => [`${value} GB`, "Total RAM"]}
              contentStyle={{
                background: "#0c1730",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 16,
                fontSize: 14,
              }}
            />
            <Area
              type="monotone"
              dataKey="totalProjectRamGb"
              name="Total RAM (GB)"
              stroke="#8d6df5"
              strokeWidth={4}
              fillOpacity={1}
              fill="url(#zoomRamColor)"
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (zoomedChart === "storage_util") {
      if (isComparisonMode) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredStorageTrends} margin={{ top: 30, right: 20, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fill: "#9eb1cf", fontSize: 13 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: "#9eb1cf", fontSize: 13 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: any) => [`${value}%`, "Utilization"]}
                contentStyle={{
                  background: "#0c1730",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 16,
                  fontSize: 14,
                }}
              />
              <ReferenceLine
                y={80}
                stroke="#df4b5f"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: "Critical Limit (80%)",
                  fill: "#df4b5f",
                  fontSize: 12,
                  position: "top",
                  fontWeight: "bold",
                }}
              />
              <Bar
                dataKey="utilizationPercent"
                name="Utilization (%)"
                fill="#f0a144"
                radius={[8, 8, 0, 0]}
                label={(props: any) => {
                  const { x, y, width, value } = props;
                  if (value === undefined || value === null) return null;
                  return (
                    <text
                      x={x + width / 2}
                      y={y - 8}
                      fill="#f0a144"
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight="bold"
                    >
                      {`${Number(value).toFixed(1)}%`}
                    </text>
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      }
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredStorageTrends} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="month" tick={{ fill: "#9eb1cf", fontSize: 13 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: "#9eb1cf", fontSize: 13 }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value: any) => [`${value}%`, "Utilization"]}
              contentStyle={{
                background: "#0c1730",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 16,
                fontSize: 14,
              }}
            />
            <ReferenceLine
              y={80}
              stroke="#df4b5f"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: "Critical Limit (80%)",
                fill: "#df4b5f",
                fontSize: 12,
                position: "top",
                fontWeight: "bold",
              }}
            />
            <Line
              type="monotone"
              dataKey="utilizationPercent"
              name="Utilization (%)"
              stroke="#f0a144"
              strokeWidth={4.5}
              dot={{ r: 6, fill: "#f0a144" }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (zoomedChart === "storage_cap") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filteredStorageTrends} margin={{ top: 30, right: 20, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="month" tick={{ fill: "#9eb1cf", fontSize: 13 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#9eb1cf", fontSize: 13 }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value: any, name: any) => [`${value.toFixed(1)} TB`, name]}
              contentStyle={{
                background: "#0c1730",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 16,
                fontSize: 14,
              }}
            />
            <Bar
              dataKey="usedCapacityTb"
              name="Used Space (TB)"
              fill="#df4b5f"
              stackId="storage"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="freeCapacityTb"
              name="Free Space (TB)"
              fill="rgba(255, 255, 255, 0.08)"
              stroke="rgba(255, 255, 255, 0.15)"
              stackId="storage"
              radius={[6, 6, 0, 0]}
              label={(props: any) => {
                const { x, y, width, index } = props;
                const dataItem = filteredStorageTrends[index];
                if (!dataItem) return null;
                const pct = dataItem.utilizationPercent;
                if (pct === undefined || pct === null) return null;
                return (
                  <text
                    x={x + width / 2}
                    y={y - 10}
                    fill="#f0a144"
                    textAnchor="middle"
                    fontSize={13}
                    fontWeight="bold"
                  >
                    {`${Number(pct).toFixed(1)}%`}
                  </text>
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  return (
    <MainLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Capacity & Trends Analytics</h1>
          <p className="text-sm text-gray-400 mt-1">
            Historical month-over-month infrastructure capacity tracking.
          </p>
        </div>

        {/* Premium Segmented Toggle Switch */}
        <div className="flex items-center self-start sm:self-center rounded-xl bg-white/[0.04] p-1 border border-white/5 backdrop-blur-md">
          <button
            onClick={() => setIsComparisonMode(false)}
            className={`rounded-lg px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200 ${
              !isComparisonMode
                ? "bg-cyan-500/20 text-cyan-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_15px_rgba(6,182,212,0.15)] border border-cyan-500/20"
                : "text-slate-400 hover:text-white border border-transparent"
            }`}
          >
            Continuous Trends
          </button>
          <button
            onClick={() => setIsComparisonMode(true)}
            className={`rounded-lg px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200 ${
              isComparisonMode
                ? "bg-cyan-500/20 text-cyan-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_15px_rgba(6,182,212,0.15)] border border-cyan-500/20"
                : "text-slate-400 hover:text-white border border-transparent"
            }`}
          >
            Custom Comparison
          </button>
        </div>
      </div>

      {isComparisonMode && (
        <div 
          className="relative z-30 mb-8 rounded-2xl border border-white/10 p-5 backdrop-blur-md transition-all duration-300 animate-fade-in"
          style={{
            background: "linear-gradient(180deg, rgba(30,41,59,0.3) 0%, rgba(15,23,42,0.4) 100%)",
          }}
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="w-full md:max-w-xs">
              <MultiSelect
                label="Compare Snapshots"
                options={allAvailableMonths}
                selectedValues={selectedMonths}
                onChange={setSelectedMonths}
              />
            </div>
            <div className="text-xs text-slate-400 flex flex-col gap-1 md:text-right max-w-lg">
              <span className="font-semibold text-slate-200">Custom Comparison Mode Active</span>
              <p>
                Select two or more snapshots to compare and auto-calculate delta variances across your compute and storage resources. Continuous graphs will dynamically transition to comparative discrete bar charts.
              </p>
            </div>
          </div>
        </div>
      )}

      {isComparisonMode && selectedMonths.length < 2 && (
        <div className="mb-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center text-sm text-amber-400 backdrop-blur-md animate-fade-in">
          ⚠️ Please select at least two snapshots in the filter above to generate comparison metrics and comparative charts.
        </div>
      )}

      {isComparisonMode && selectedMonths.length >= 2 && comparisonDeltas && (
        <div className="mb-8 animate-fade-in">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Delta Variance Analysis ({comparisonDeltas.baselineMonth} vs {comparisonDeltas.targetMonth})
            </h3>
            <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-400">
              Baseline-to-Target Delta
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* VM Delta */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 backdrop-blur-md shadow-lg hover:border-cyan-500/30 transition duration-300">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">VM Instance Delta</p>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-black text-white tracking-tight font-mono">{comparisonDeltas.vms.targetVal}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-mono font-bold ${
                  comparisonDeltas.vms.diff >= 0 
                    ? "bg-emerald-500/10 text-emerald-400" 
                    : "bg-rose-500/10 text-rose-400"
                }`}>
                  {comparisonDeltas.vms.diff >= 0 ? "+" : ""}{comparisonDeltas.vms.diff} ({comparisonDeltas.vms.pct >= 0 ? "+" : ""}{comparisonDeltas.vms.pct.toFixed(1)}%)
                </span>
              </div>
              <p className="mt-2.5 text-[10px] text-slate-500">Instance change from {comparisonDeltas.baselineMonth}</p>
            </div>

            {/* CPU Delta */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 backdrop-blur-md shadow-lg hover:border-cyan-500/30 transition duration-300">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">CPU Cores Delta</p>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-black text-white tracking-tight font-mono">{comparisonDeltas.cpu.targetVal.toFixed(1)}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-mono font-bold ${
                  comparisonDeltas.cpu.diff >= 0 
                    ? "bg-emerald-500/10 text-emerald-400" 
                    : "bg-rose-500/10 text-rose-400"
                }`}>
                  {comparisonDeltas.cpu.diff >= 0 ? "+" : ""}{comparisonDeltas.cpu.diff.toFixed(1)} ({comparisonDeltas.cpu.pct >= 0 ? "+" : ""}{comparisonDeltas.cpu.pct.toFixed(1)}%)
                </span>
              </div>
              <p className="mt-2.5 text-[10px] text-slate-500">Total core shift from {comparisonDeltas.baselineMonth}</p>
            </div>

            {/* RAM Delta */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 backdrop-blur-md shadow-lg hover:border-cyan-500/30 transition duration-300">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">RAM Allocation Delta</p>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-black text-white tracking-tight font-mono">{comparisonDeltas.ram.targetVal.toFixed(0)} GB</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-mono font-bold ${
                  comparisonDeltas.ram.diff >= 0 
                    ? "bg-emerald-500/10 text-emerald-400" 
                    : "bg-rose-500/10 text-rose-400"
                }`}>
                  {comparisonDeltas.ram.diff >= 0 ? "+" : ""}{comparisonDeltas.ram.diff.toFixed(0)} GB ({comparisonDeltas.ram.pct >= 0 ? "+" : ""}{comparisonDeltas.ram.pct.toFixed(1)}%)
                </span>
              </div>
              <p className="mt-2.5 text-[10px] text-slate-500">RAM allocation shift from {comparisonDeltas.baselineMonth}</p>
            </div>

            {/* Storage Util Delta */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 backdrop-blur-md shadow-lg hover:border-cyan-500/30 transition duration-300">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Storage Util. Shift</p>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-black text-white tracking-tight font-mono">{comparisonDeltas.utilization.targetVal.toFixed(1)}%</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-mono font-bold ${
                  comparisonDeltas.utilization.diff >= 0 
                    ? "bg-rose-500/10 text-rose-400" 
                    : "bg-emerald-500/10 text-emerald-400"
                }`}>
                  {comparisonDeltas.utilization.diff >= 0 ? "+" : ""}{comparisonDeltas.utilization.diff.toFixed(1)}%
                </span>
              </div>
              <p className="mt-2.5 text-[10px] text-slate-500">Absolute usage variance from {comparisonDeltas.baselineMonth}</p>
            </div>

            {/* Total Storage Capacity Delta */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 backdrop-blur-md shadow-lg hover:border-cyan-500/30 transition duration-300">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Storage Delta</p>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-black text-white tracking-tight font-mono">{comparisonDeltas.capacity.targetVal.toFixed(1)} TB</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-mono font-bold ${
                  comparisonDeltas.capacity.diff >= 0 
                    ? "bg-emerald-500/10 text-emerald-400" 
                    : "bg-rose-500/10 text-rose-400"
                }`}>
                  {comparisonDeltas.capacity.diff >= 0 ? "+" : ""}{comparisonDeltas.capacity.diff.toFixed(1)} TB ({comparisonDeltas.capacity.pct >= 0 ? "+" : ""}{comparisonDeltas.capacity.pct.toFixed(1)}%)
                </span>
              </div>
              <p className="mt-2.5 text-[10px] text-slate-500">Capacity increase from {comparisonDeltas.baselineMonth}</p>
            </div>
          </div>
        </div>
      )}

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
              
              {/* VM Growth Panel */}
              <Panel title="Month-Over-Month VM Growth" onZoom={() => setZoomedChart("vm")}>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {isComparisonMode ? (
                      <BarChart data={filteredComputeTrends} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="month" tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(value: any) => [`${value} VMs`, "Total VMs"]}
                          contentStyle={{
                            background: "#0c1730",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 14,
                          }}
                        />
                        <Bar
                          dataKey="totalProjectVms"
                          name="Total VMs"
                          fill="#2dd4bf"
                          radius={[6, 6, 0, 0]}
                          label={(props: any) => {
                            const { x, y, width, value } = props;
                            if (value === undefined || value === null) return null;
                            return (
                              <text
                                x={x + width / 2}
                                y={y - 6}
                                fill="#2dd4bf"
                                textAnchor="middle"
                                fontSize={11}
                                fontWeight="bold"
                              >
                                {value}
                              </text>
                            );
                          }}
                        />
                      </BarChart>
                    ) : (
                      <AreaChart data={filteredComputeTrends} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <defs>
                          <linearGradient id="vmColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0.01} />
                          </linearGradient>
                        </defs>
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
                        <Area
                          type="monotone"
                          dataKey="totalProjectVms"
                          name="Total VMs"
                          stroke="#2dd4bf"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#vmColor)"
                        />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </Panel>

              {/* CPU Growth Panel */}
              <Panel title="Month-Over-Month CPU Growth" onZoom={() => setZoomedChart("cpu")}>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {isComparisonMode ? (
                      <BarChart data={filteredComputeTrends} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="month" tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(value: any) => [`${Number(value).toFixed(1)} Cores`, "Total CPU"]}
                          contentStyle={{
                            background: "#0c1730",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 14,
                          }}
                        />
                        <Bar
                          dataKey="totalProjectCpu"
                          name="Total CPU (Project)"
                          fill="#3b82f6"
                          radius={[6, 6, 0, 0]}
                          label={(props: any) => {
                            const { x, y, width, value } = props;
                            if (value === undefined || value === null) return null;
                            return (
                              <text
                                x={x + width / 2}
                                y={y - 6}
                                fill="#3b82f6"
                                textAnchor="middle"
                                fontSize={11}
                                fontWeight="bold"
                              >
                                {Number(value).toFixed(1)}
                              </text>
                            );
                          }}
                        />
                      </BarChart>
                    ) : (
                      <AreaChart data={filteredComputeTrends} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <defs>
                          <linearGradient id="cpuColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
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
                        <Area
                          type="monotone"
                          dataKey="totalProjectCpu"
                          name="Total CPU (Project)"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#cpuColor)"
                        />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </Panel>

              {/* RAM Growth Panel */}
              <Panel title="Month-Over-Month RAM Growth (GB)" onZoom={() => setZoomedChart("ram")}>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {isComparisonMode ? (
                      <BarChart data={filteredComputeTrends} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="month" tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(value: any) => [`${Number(value).toFixed(1)} GB`, "Total RAM"]}
                          contentStyle={{
                            background: "#0c1730",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 14,
                          }}
                        />
                        <Bar
                          dataKey="totalProjectRamGb"
                          name="Total RAM (GB)"
                          fill="#8d6df5"
                          radius={[6, 6, 0, 0]}
                          label={(props: any) => {
                            const { x, y, width, value } = props;
                            if (value === undefined || value === null) return null;
                            return (
                              <text
                                x={x + width / 2}
                                y={y - 6}
                                fill="#8d6df5"
                                textAnchor="middle"
                                fontSize={11}
                                fontWeight="bold"
                              >
                                {`${Number(value).toFixed(0)} GB`}
                              </text>
                            );
                          }}
                        />
                      </BarChart>
                    ) : (
                      <AreaChart data={filteredComputeTrends} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <defs>
                          <linearGradient id="ramColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8d6df5" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#8d6df5" stopOpacity={0.01} />
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
                        <Area
                          type="monotone"
                          dataKey="totalProjectRamGb"
                          name="Total RAM (GB)"
                          stroke="#8d6df5"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#ramColor)"
                        />
                      </AreaChart>
                    )}
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

              {/* Storage Utilization Trend Panel */}
              <Panel title="Storage Utilization Trend (%)" onZoom={() => setZoomedChart("storage_util")}>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {isComparisonMode ? (
                      <BarChart data={filteredStorageTrends} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="month" tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(value: any) => [`${value}%`, "Utilization"]}
                          contentStyle={{
                            background: "#0c1730",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 14,
                          }}
                        />
                        <ReferenceLine
                          y={80}
                          stroke="#df4b5f"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          label={{
                            value: "Critical Limit (80%)",
                            fill: "#df4b5f",
                            fontSize: 10,
                            position: "top",
                            fontWeight: "bold",
                          }}
                        />
                        <Bar
                          dataKey="utilizationPercent"
                          name="Utilization (%)"
                          fill="#f0a144"
                          radius={[6, 6, 0, 0]}
                          label={(props: any) => {
                            const { x, y, width, value } = props;
                            if (value === undefined || value === null) return null;
                            return (
                              <text
                                x={x + width / 2}
                                y={y - 6}
                                fill="#f0a144"
                                textAnchor="middle"
                                fontSize={11}
                                fontWeight="bold"
                              >
                                {`${Number(value).toFixed(1)}%`}
                              </text>
                            );
                          }}
                        />
                      </BarChart>
                    ) : (
                      <LineChart data={filteredStorageTrends} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
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
                        <ReferenceLine
                          y={80}
                          stroke="#df4b5f"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          label={{
                            value: "Critical Limit (80%)",
                            fill: "#df4b5f",
                            fontSize: 10,
                            position: "top",
                            fontWeight: "bold",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="utilizationPercent"
                          name="Utilization (%)"
                          stroke="#f0a144"
                          strokeWidth={3.5}
                          dot={{ r: 5, fill: "#f0a144" }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </Panel>

              {/* Storage Capacity Allocation Panel */}
              <Panel title="Storage Capacity Allocation (TB)" onZoom={() => setZoomedChart("storage_cap")}>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredStorageTrends} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="month" tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#9eb1cf", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(value: any, name: any) => [`${value.toFixed(1)} TB`, name]}
                        contentStyle={{
                          background: "#0c1730",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 14,
                        }}
                      />
                      <Bar
                        dataKey="usedCapacityTb"
                        name="Used Space (TB)"
                        fill="#df4b5f"
                        stackId="storage"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="freeCapacityTb"
                        name="Free Space (TB)"
                        fill="rgba(255, 255, 255, 0.08)"
                        stroke="rgba(255, 255, 255, 0.15)"
                        stackId="storage"
                        radius={[6, 6, 0, 0]}
                        label={(props: any) => {
                          const { x, y, width, index } = props;
                          const dataItem = filteredStorageTrends[index];
                          if (!dataItem) return null;
                          const pct = dataItem.utilizationPercent;
                          if (pct === undefined || pct === null) return null;
                          return (
                            <text
                              x={x + width / 2}
                              y={y - 8}
                              fill="#f0a144"
                              textAnchor="middle"
                              fontSize={12}
                              fontWeight="bold"
                            >
                              {`${Number(pct).toFixed(1)}%`}
                            </text>
                          );
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

            </div>
          </div>
        </div>
      )}

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

            {/* Right Side: Operational Stats & Log Table */}
            <div className="w-full border-t border-white/10 bg-slate-950/30 p-6 md:w-[400px] md:border-t-0 md:border-l flex flex-col md:p-8 shrink-0">
              <div className="mb-6">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Operational Focus</h4>
                <p className="mt-1 text-xs text-slate-500">Key metrics and sorted historical records.</p>
              </div>

              {/* Grid Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="text-xs text-slate-400 font-medium">Peak Recorded</p>
                  <p className="mt-1.5 text-lg font-bold text-amber-400 tracking-tight">{zoomedChartInfo.peak}</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="text-xs text-slate-400 font-medium">Current Status</p>
                  <p className="mt-1.5 text-lg font-bold text-cyan-400 tracking-tight">{zoomedChartInfo.latest}</p>
                </div>
              </div>

              {/* Historical Log */}
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Historical Log</span>
                  <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-400">Newest First</span>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-0">
                  {zoomedChartInfo.tableRows.map((row: any, i: number) => {
                    const isPositive = row.changeText.startsWith("+");
                    const isNegative = row.changeText.startsWith("-") && row.changeText !== "-";
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.015] px-4 py-3 hover:bg-white/[0.03] transition"
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-200">{row.month}</p>
                          <p className="mt-1 text-sm font-bold text-white font-mono">{row.value}</p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-mono font-semibold ${
                              isPositive
                                ? "bg-emerald-500/10 text-emerald-400"
                                : isNegative
                                ? "bg-red-500/10 text-red-400"
                                : "bg-white/5 text-slate-400"
                            }`}
                          >
                            {row.changeText}
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
