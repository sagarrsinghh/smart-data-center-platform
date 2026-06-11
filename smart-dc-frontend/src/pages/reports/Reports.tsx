import { useEffect, useState, useMemo } from "react";
import { deleteReport, downloadReport, generateReport, getReports } from "../../api/reports.api";
import MainLayout from "../../layouts/MainLayout";
import { unwrapApiData } from "../../utils/api";

const panelStyle = {
  background: "linear-gradient(180deg, rgba(29,47,82,0.92) 0%, rgba(17,29,51,0.96) 100%)",
  backdropFilter: "blur(22px)",
};

export default function Reports() {
  const [reports, setReports] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", type: "capacity", format: "xlsx" });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

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

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      await generateReport(form);
      setForm({ title: "", type: "capacity", format: "xlsx" });
      await fetchReports();
    } finally {
      setGenerating(false);
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

  // Archive Telemetry Metrics
  const archiveMetrics = useMemo(() => {
    const total = reports.length;
    const excelCount = reports.filter((r) => r.type === "xlsx").length;
    const pdfCount = reports.filter((r) => r.type === "pdf").length;
    const csvCount = reports.filter((r) => r.type === "csv").length;
    return { total, excelCount, pdfCount, csvCount };
  }, [reports]);

  // Dynamic File Format Icon
  const getFileIcon = (format: string) => {
    const normalized = format?.toLowerCase();
    if (normalized === "pdf") {
      return (
        <span className="h-10 w-10 flex shrink-0 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </span>
      );
    }
    if (normalized === "xlsx") {
      return (
        <span className="h-10 w-10 flex shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
          </svg>
        </span>
      );
    }
    return (
      <span className="h-10 w-10 flex shrink-0 items-center justify-center rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5-3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      </span>
    );
  };

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Executive Report Center</h1>
          <p className="text-sm text-gray-400 mt-1">
            Generate highly formatted, professional PDF, Excel, and CSV summaries representing the entire data center's storage and compute posture.
          </p>
        </div>
        <button
          onClick={() => void fetchReports()}
          className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 text-sm font-semibold transition self-start"
        >
          Refresh Archive
        </button>
      </div>

      {/* DYNAMIC TELEMETRY KPI TILES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {[
          { label: "Total Reports Generated", value: `${archiveMetrics.total} files`, desc: "In-memory file archives" },
          { label: "Excel Spreadsheets", value: `${archiveMetrics.excelCount} sheets`, desc: "Workbook structured sheets" },
          { label: "Executive PDFs", value: `${archiveMetrics.pdfCount} files`, desc: "Premium highly formatted reports" },
          { label: "CSV Flat Exports", value: `${archiveMetrics.csvCount} exports`, desc: "Comma separated flat arrays" },
        ].map((item, index) => (
          <div
            key={index}
            className="rounded-2xl border border-white/[0.06] p-5"
            style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
          >
            <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">{item.label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-white">{item.value}</p>
            <p className="text-[11px] text-slate-500 mt-1">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.8fr_1fr] gap-6">
        
        {/* LEFT COLUMN: REPORT ARCHIVE TABLE */}
        <div className="flex flex-col min-w-0">
          <div className="mb-4 flex items-center justify-between border-b border-white/8 pb-3 shrink-0">
            <h2 className="text-base font-bold text-white tracking-tight">Generated Archives</h2>
            <span className="text-[10px] bg-slate-900/60 border border-white/5 px-2 py-0.5 rounded text-slate-400">
              Systematic Storage
            </span>
          </div>

          <div
            className="rounded-2xl border border-white/[0.06] overflow-hidden"
            style={panelStyle}
          >
            {loading ? (
              <div className="py-16 text-center text-gray-400">Loading reports list...</div>
            ) : reports.length === 0 ? (
              <div className="py-16 text-center text-slate-500 font-medium">No reports generated in this snapshot yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900/40 border-b border-white/[0.06]">
                      <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-slate-400">Archive File</th>
                      <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-slate-400">Type</th>
                      <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-slate-400">Generated</th>
                      <th className="px-6 py-4 text-right text-xs uppercase tracking-wider text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-white/[0.02] transition">
                        <td className="px-6 py-4 flex items-center gap-3">
                          {getFileIcon(report.type)}
                          <div className="min-w-0">
                            <p className="text-white font-semibold tracking-tight truncate max-w-[250px]" title={report.file_name}>
                              {report.file_name}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">ID: #{report.id}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                            report.type === "pdf"
                              ? "bg-red-500/10 border-red-500/20 text-red-400"
                              : report.type === "xlsx"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : "bg-slate-500/10 border-slate-500/20 text-slate-300"
                          }`}>
                            {report.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs font-medium">
                          {new Date(report.created_at).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              onClick={() => void handleDownload(report)}
                              className="px-3.5 py-1.5 rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold transition"
                            >
                              Download
                            </button>
                            <button
                              onClick={() => void deleteReport(String(report.id)).then(fetchReports)}
                              className="px-3.5 py-1.5 rounded-lg border border-red-500/20 hover:border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition"
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

        {/* RIGHT COLUMN: GENERATOR INTERACTIVE CONTROL PANEL */}
        <div
          className="rounded-2xl border border-indigo-500/15 p-6 h-fit"
          style={{
            background: "linear-gradient(180deg, rgba(24,36,60,0.92) 0%, rgba(14,22,39,0.96) 100%)",
            backdropFilter: "blur(22px)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
            <h2 className="text-base font-bold text-white tracking-tight">Report Configuration</h2>
          </div>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Configure metadata, scope parameters, and output types. Dynamic summaries compute layout indices on generation.
          </p>

          <div className="space-y-4">
            
            {/* Input Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Report Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="E.g., Q1 Infrastructure Allocation Summary"
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition placeholder:text-slate-600"
              />
            </div>

            {/* Select Report Scope */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Data Scope (Report Type)</label>
              <select
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="capacity">Storage Capacity & Stress Index Summary</option>
                <option value="analytics">App vs DB Splitting & VM Baseline Analysis</option>
              </select>
            </div>

            {/* Select Document Format */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Document Format</label>
              <select
                value={form.format}
                onChange={(event) => setForm((current) => ({ ...current, format: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="xlsx">Excel Workbook (.xlsx)</option>
                <option value="pdf">Premium Formatted Document (.pdf)</option>
                <option value="csv">Comma-Separated Values (.csv)</option>
              </select>
            </div>

            {/* Generate Action Button */}
            <button
              onClick={() => void handleGenerate()}
              disabled={generating}
              className="w-full mt-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.98] text-white text-sm font-bold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Report...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  Generate Archive File
                </>
              )}
            </button>

          </div>
        </div>

      </div>
    </MainLayout>
  );
}
