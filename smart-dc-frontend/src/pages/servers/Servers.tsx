import { useEffect, useState } from "react";

import { getStorageAssets } from "../../api/infra.api";
import MainLayout from "../../layouts/MainLayout";
import { getArrayPayload, getObjectPayload } from "../../utils/api";

export default function Servers() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await getStorageAssets();
      const payload = getObjectPayload<any>(res);
      setAssets(Array.isArray(payload.data) ? payload.data : getArrayPayload<any>(res));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Storage Assets</h1>
          <p className="text-sm text-gray-400 mt-1">
            Physical storage arrays and their current utilization, mapped by location.
          </p>
        </div>
        <button onClick={() => void fetchAssets()} className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-gray-300">Refresh</button>
      </div>

      <div
        className="rounded-2xl border border-white/[0.06] overflow-hidden"
        style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
      >
        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading storage assets...</div>
        ) : assets.length === 0 ? (
          <div className="py-16 text-center text-gray-500">No storage assets found in the active snapshot.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Device</th>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Location</th>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">OEM / Model</th>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Total (TB)</th>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Used (TB)</th>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Unused (TB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-white font-medium">{asset.deviceName}</td>
                    <td className="px-6 py-4 text-cyan-400">{asset.location?.code || "-"}</td>
                    <td className="px-6 py-4 text-gray-300">
                      {asset.oem} {asset.model}
                    </td>
                    <td className="px-6 py-4 text-emerald-400">{Number(asset.totalCapacityTb || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-amber-400">{Number(asset.usedCapacityTb || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-blue-400">{Number(asset.unusedCapacityTb || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
