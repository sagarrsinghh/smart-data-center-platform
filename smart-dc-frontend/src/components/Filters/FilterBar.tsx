import { useEffect, useState } from "react";

import { getServers } from "../../api/servers.api";
import { getArrayPayload } from "../../utils/api";

interface Props {
  onFilterChange: (filters: { serverId: string; range: string }) => void;
}

export default function FilterBar({ onFilterChange }: Props) {
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServer, setSelectedServer] = useState("");
  const [timeRange, setTimeRange] = useState("all");

  useEffect(() => {
    void fetchServers();
  }, []);

  const fetchServers = async () => {
    const res = await getServers();
    setServers(getArrayPayload<any>(res));
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] px-4 py-4 flex flex-col md:flex-row gap-4 items-start md:items-center" style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}>
      <select
        value={selectedServer}
        onChange={(event) => setSelectedServer(event.target.value)}
        className="bg-[#020617] border border-white/10 px-3 py-2 rounded-xl text-sm text-white"
      >
        <option value="">All Servers</option>
        {servers.map((server) => (
          <option key={server.id} value={server.id}>
            {server.name}
          </option>
        ))}
      </select>

      <select
        value={timeRange}
        onChange={(event) => setTimeRange(event.target.value)}
        className="bg-[#020617] border border-white/10 px-3 py-2 rounded-xl text-sm text-white"
      >
        <option value="all">All Time</option>
        <option value="1h">Last 1h</option>
        <option value="6h">Last 6h</option>
        <option value="24h">Last 24h</option>
        <option value="7d">Last 7d</option>
        <option value="30d">Last 30d</option>
      </select>

      <button
        onClick={() => onFilterChange({ serverId: selectedServer, range: timeRange })}
        className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium transition-colors"
      >
        Apply Filters
      </button>
    </div>
  );
}
