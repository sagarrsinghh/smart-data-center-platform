import { useEffect, useState } from "react";

import { deleteReport, downloadReport, generateReport, getReports } from "../../api/reports.api";
import MainLayout from "../../layouts/MainLayout";
import { unwrapApiData } from "../../utils/api";

export default function Reports() {
  const [reports, setReports] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", type: "capacity", format: "xlsx" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await getReports();
      setReports(unwrapApiData<any[]>(res) || []);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (report: any) => {
    const res = await downloadReport(String(report.id));
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = report.file_name || `report-${report.id}.${report.type}`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <MainLayout>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Reports</h1>
              <p className="text-sm text-gray-400 mt-1">
                Generate workbook-aligned summaries of infrastructure allocations.
              </p>
            </div>
          </div>

          <div
            className="rounded-2xl border border-white/[0.06] overflow-hidden"
            style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
          >
            {loading ? (
              <div className="py-16 text-center text-gray-400">Loading reports...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                      <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">File</th>
                      <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Format</th>
                      <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Created</th>
                      <th className="px-6 py-4 text-right text-xs uppercase tracking-wider text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-white/[0.02]">
                        <td className="px-6 py-4 text-white font-medium">{report.file_name}</td>
                        <td className="px-6 py-4 text-gray-300 uppercase">{report.type}</td>
                        <td className="px-6 py-4 text-gray-400 text-xs">
                          {new Date(report.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => void handleDownload(report)}
                              className="px-3 py-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 text-xs"
                            >
                              Download
                            </button>
                            <button
                              onClick={() => void deleteReport(String(report.id)).then(fetchReports)}
                              className="px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div
          className="rounded-2xl border border-white/[0.06] p-6"
          style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
        >
          <h2 className="text-base font-semibold text-white mb-4">Generate Report</h2>
          <div className="space-y-4">
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Report title"
              className="w-full rounded-xl border border-white/10 bg-[#020617] px-4 py-3 text-sm text-white"
            />
            <select
              value={form.type}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-[#020617] px-4 py-3 text-sm text-white"
            >
              <option value="capacity">Capacity Warning Summary</option>
              <option value="analytics">App vs DB Splitting</option>
            </select>
            <select
              value={form.format}
              onChange={(event) => setForm((current) => ({ ...current, format: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-[#020617] px-4 py-3 text-sm text-white"
            >
              <option value="xlsx">Excel</option>
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </select>
            <button
              onClick={() =>
                void generateReport(form).then(async () => {
                  setForm({ title: "", type: "capacity", format: "xlsx" });
                  await fetchReports();
                })
              }
              className="w-full px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium"
            >
              Generate
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
