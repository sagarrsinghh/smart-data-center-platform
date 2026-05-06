import { useEffect, useState } from "react";

import {
  activateImportBatch,
  deleteImportBatch,
  getImportBatches,
  getImportDetail,
  getImportStatus,
  importWorkbook,
  previewWorkbookImport,
} from "../../api/imports.api";
import MainLayout from "../../layouts/MainLayout";
import { extractErrorMessage } from "../../utils/error";
import { getArrayPayload, getObjectPayload, unwrapApiData } from "../../utils/api";

interface WorkbookPreview {
  preview: {
    sheets: Array<{
      name: string;
      rowCount: number;
      previewRows: string[][];
    }>;
  };
  summary: {
    projectCount: number;
    deploymentCount: number;
    storageAssetCount: number;
    warningCount: number;
    errorCount: number;
    totals: {
      totalVmQuantity: number;
      totalCore: number;
      totalRamGb: number;
      totalProjectVms: number;
      totalProjectCpu: number;
      totalProjectRamGb: number;
      totalStorageTb: number;
      usedStorageTb: number;
    };
  };
  issues: Array<{
    severity: string;
    scope: string;
    sourceSheet?: string;
    sourceRowNumber?: number;
    message: string;
  }>;
}

interface ImportBatchRecord {
  id: number;
  originalFilename: string;
  status: string;
  isActive: boolean;
  summary?: WorkbookPreview["summary"];
  createdAt: string;
  recordDate?: string;
}

interface ImportIssue {
  id: number;
  severity: string;
  sourceSheet?: string;
  sourceRowNumber?: number;
  message: string;
}

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [batches, setBatches] = useState<ImportBatchRecord[]>([]);
  const [status, setStatus] = useState<any>({});
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedBatchIssues, setSelectedBatchIssues] = useState<ImportIssue[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingBatchId, setDeletingBatchId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    void refreshImports();
  }, []);

  useEffect(() => {
    if (!selectedBatchId) {
      setSelectedBatchIssues([]);
      return;
    }

    void loadBatchDetail(selectedBatchId);
  }, [selectedBatchId]);

  const refreshImports = async () => {
    try {
      setLoading(true);
      const [batchesRes, statusRes] = await Promise.all([
        getImportBatches(),
        getImportStatus(),
      ]);

      setBatches(getArrayPayload<ImportBatchRecord>(batchesRes));
      setStatus(getObjectPayload<any>(statusRes));
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to load workbook imports."));
    } finally {
      setLoading(false);
    }
  };

  const loadBatchDetail = async (batchId: string) => {
    try {
      const res = await getImportDetail(batchId);
      const payload = getObjectPayload<any>(res);
      setSelectedBatchIssues(Array.isArray(payload.issues) ? payload.issues : []);
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to load import details."));
    }
  };

  const handlePreview = async (nextFile: File | null) => {
    setFile(nextFile);
    setPreview(null);
    setError("");

    if (!nextFile) {
      return;
    }

    try {
      setBusy(true);
      const res = await previewWorkbookImport(nextFile);
      setPreview(unwrapApiData<WorkbookPreview>(res));
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to preview workbook."));
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    if (!file || !selectedMonth || !selectedYear) {
      setError("Please select a file, month, and year.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      await importWorkbook(file, true, selectedMonth, selectedYear);
      setFile(null);
      setPreview(null);
      setSelectedMonth("");
      setSelectedYear("");
      setSelectedBatchId("");
      await refreshImports();
    } catch (err: any) {
      setError(extractErrorMessage(err, "Workbook import failed."));
    } finally {
      setBusy(false);
    }
  };

  const activeBatch = batches.find((batch) => batch.isActive);
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);
  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Workbook Imports</h1>
          <p className="text-sm text-gray-400 mt-1">
            Upload the real infra workbook, assign its timeframe, and validate warnings.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Imports", value: status.total || 0 },
          { label: "Completed", value: status.completed || 0 },
          { label: "Processing", value: status.processing || 0 },
          { label: "Failed", value: status.failed || 0 },
          { label: "Active Snapshot", value: status.activeImportId || "-" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-white/[0.06] p-5"
            style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
          >
            <p className="text-xs uppercase tracking-widest text-gray-400">{item.label}</p>
            <p className="mt-2 text-3xl font-bold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div
        className="rounded-2xl border border-white/[0.06] p-6"
        style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
      >
        <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-6">
          <div>
            <h2 className="text-base font-semibold text-white">1. Select Data Timeframe</h2>
            <p className="text-sm text-gray-400 mt-1 mb-4">
              Explicitly specify the month and year this workbook represents for accurate historical trending.
            </p>

            <div className="flex gap-4 mb-6">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-[#020617] px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="" disabled>Select Month</option>
                {months.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-[#020617] px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="" disabled>Select Year</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <h2 className="text-base font-semibold text-white">2. Preview Workbook</h2>
            <p className="text-sm text-gray-400 mt-1 mb-4">
              Select the Excel file to parse projects and storage capacity.
            </p>

            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => void handlePreview(event.target.files?.[0] || null)}
              className="block w-full rounded-xl border border-white/10 bg-[#020617] px-4 py-3 text-sm text-white"
            />

            {file && <p className="mt-3 text-sm text-cyan-400">{file.name}</p>}

            <div className="mt-6 grid grid-cols-1 gap-3">
              {[
                "3. Detect required workbook sheets",
                "4. Normalize project deployment rows",
                "5. Parse storage location sections",
                "6. Save versioned snapshot and activate it",
              ].map((stage) => (
                <div
                  key={stage}
                  className="rounded-xl border border-white/[0.06] px-4 py-3 bg-white/[0.02] text-sm text-gray-300"
                >
                  {stage}
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => void handleImport()}
                disabled={!file || !selectedMonth || !selectedYear || busy || !preview}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white font-medium transition-colors"
              >
                {busy ? "Processing..." : "Import Workbook Snapshot"}
              </button>
            </div>
            {(!selectedMonth || !selectedYear) && file && (
               <p className="text-xs text-red-400 text-right mt-2">Please select Month and Year to enable import.</p>
            )}
          </div>

          <div>
            {preview ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "VM Count", value: preview.summary.totals.totalVmQuantity },
                    { label: "Core Count", value: preview.summary.totals.totalCore },
                    { label: "RAM Count", value: preview.summary.totals.totalRamGb },
                    { label: "Warnings", value: preview.summary.warningCount },
                    { label: "Proj. Total VMs", value: preview.summary.totals.totalProjectVms },
                    { label: "Proj. Total CPU", value: preview.summary.totals.totalProjectCpu },
                    { label: "Proj. Total RAM", value: preview.summary.totals.totalProjectRamGb },
                    { label: "Deployments", value: preview.summary.deploymentCount },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{item.label}</p>
                      <p className="mt-1 text-xl font-bold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {preview.preview.sheets.map((sheet) => (
                    <div key={sheet.name} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-white">{sheet.name}</h3>
                          <p className="text-xs text-gray-500 mt-1">{sheet.rowCount} rows detected</p>
                        </div>
                      </div>

                      <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.06]">
                        <table className="w-full text-sm">
                          <tbody>
                            {sheet.previewRows.slice(0, 6).map((row, rowIndex) => (
                              <tr key={`${sheet.name}-${rowIndex}`} className="border-b border-white/[0.04]">
                                <td className="px-4 py-3 text-xs text-gray-500">#{rowIndex + 1}</td>
                                {row.map((cell, cellIndex) => (
                                  <td key={`${sheet.name}-${rowIndex}-${cellIndex}`} className="px-4 py-3 text-gray-200">
                                    {cell || "-"}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <h3 className="text-sm font-semibold text-white">Validation Warnings</h3>
                  <div className="mt-3 space-y-3 max-h-56 overflow-y-auto pr-2">
                    {preview.issues.length === 0 ? (
                      <p className="text-sm text-gray-400">No validation warnings detected in preview.</p>
                    ) : (
                      preview.issues.map((issue, index) => (
                        <div key={`${issue.message}-${index}`} className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                          <p>{issue.message}</p>
                          <p className="mt-1 text-xs text-amber-100/70">
                            {issue.sourceSheet || issue.scope}
                            {issue.sourceRowNumber ? ` • Row ${issue.sourceRowNumber}` : ""}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[420px] rounded-2xl border border-dashed border-white/10 flex items-center justify-center text-gray-500">
                Select a workbook to preview parsed projects, storage assets, and validation warnings.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-6 mt-8">
        <div
          className="rounded-2xl border border-white/[0.06] overflow-hidden"
          style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
        >
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h2 className="text-base font-semibold text-white">Snapshot History</h2>
            <p className="text-xs text-gray-500 mt-1">
              Every workbook import is stored as a versioned snapshot. One snapshot powers the dashboard.
            </p>
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-400">Loading workbook imports...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                    <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Timeframe</th>
                    <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Workbook</th>
                    <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Status</th>
                    <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-400">Projects</th>
                    <th className="px-6 py-4 text-right text-xs uppercase tracking-wider text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {batches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-md bg-purple-400/10 px-2 py-1 text-xs font-medium text-purple-400 ring-1 ring-inset ring-purple-400/30">
                           {batch.recordDate || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-white font-medium">{batch.originalFilename}</p>
                        <p className="text-[11px] text-gray-500 mt-1">
                          Imported: {new Date(batch.createdAt).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 px-2 py-1 text-xs uppercase tracking-wider text-gray-200">
                            {batch.status}
                          </span>
                          {batch.isActive && (
                            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-xs uppercase tracking-wider text-cyan-300">
                              Active
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {batch.summary?.projectCount ?? 0}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedBatchId(String(batch.id))}
                            className="px-3 py-1.5 rounded-lg border border-white/10 text-gray-200 text-xs hover:bg-white/5"
                          >
                            Inspect
                          </button>
                          {!batch.isActive && batch.status === "completed" && (
                            <button
                              onClick={() =>
                                void activateImportBatch(String(batch.id)).then(refreshImports)
                              }
                              className="px-3 py-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 text-xs hover:bg-cyan-500/20"
                            >
                              Activate
                            </button>
                          )}
                          {confirmDeleteId === batch.id ? (
                              <span className="flex items-center gap-1">
                                <span className="text-[11px] text-red-400 mr-1">
                                  {batch.isActive ? "⚠️ This is ACTIVE!" : "Sure?"}
                                </span>
                                <button
                                  disabled={deletingBatchId === batch.id}
                                  onClick={async () => {
                                    setDeletingBatchId(batch.id);
                                    try {
                                      await deleteImportBatch(String(batch.id));
                                      setConfirmDeleteId(null);
                                      await refreshImports();
                                    } catch (e: any) {
                                      setError((e as any)?.response?.data?.message || "Delete failed.");
                                    } finally {
                                      setDeletingBatchId(null);
                                    }
                                  }}
                                  className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                                >
                                  {deletingBatchId === batch.id ? "Deleting..." : "Yes, Delete"}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 rounded-lg border border-white/10 text-gray-400 text-xs hover:bg-white/5"
                                >
                                  Cancel
                                </button>
                              </span>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(batch.id)}
                                className="px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20"
                              >
                                Delete
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div
          className="rounded-2xl border border-white/[0.06] p-6"
          style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)" }}
        >
          <h2 className="text-base font-semibold text-white">Selected Snapshot Issues</h2>
          <p className="mt-1 text-sm text-gray-400">
            {activeBatch
              ? `Active snapshot: ${activeBatch.originalFilename}`
              : "No active workbook snapshot yet."}
          </p>

          <div className="mt-5 space-y-3 max-h-[430px] overflow-y-auto pr-2">
            {selectedBatchIssues.length === 0 ? (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-sm text-gray-400">
                Choose a snapshot from the table to inspect stored warnings and row-level issues.
              </div>
            ) : (
              selectedBatchIssues.map((issue) => (
                <div
                  key={issue.id}
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    issue.severity === "error"
                      ? "border-red-500/20 bg-red-500/10 text-red-200"
                      : "border-amber-500/20 bg-amber-500/10 text-amber-200"
                  }`}
                >
                  <p>{issue.message}</p>
                  <p className="mt-1 text-xs opacity-80">
                    {issue.sourceSheet || "Workbook"}
                    {issue.sourceRowNumber ? ` • Row ${issue.sourceRowNumber}` : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
