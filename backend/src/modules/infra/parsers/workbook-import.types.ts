export interface WorkbookIssue {
  severity: 'warning' | 'error';
  scope: string;
  sourceSheet?: string;
  sourceRowNumber?: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface ParsedProjectDeploymentRow {
  sourceSheet: string;
  sourceRowNumber: number;
  projectName: string;
  projectNormalizedName: string;
  environmentRaw: string;
  environmentType: string;
  locationCode: string;
  workloadType: string;
  vmQuantity: number | null;
  totalVms: number | null;
  core: number | null;
  totalCpu: number | null;
  ramGb: number | null;
  totalRamGb: number | null;
  rawValues: Record<string, unknown>;
}

export interface VmCoreRamColumnMap {
  srNo?: number;
  project: number;
  environment: number;
  workload: number;
  vmQuantity: number;
  totalVms?: number;
  core: number;
  totalCpu?: number;
  ramGb: number;
  totalRamGb?: number;
}

export interface ParsedStorageAssetRow {
  sourceSheet: string;
  sourceRowNumber: number;
  locationCode: string;
  deviceName: string;
  oem: string | null;
  model: string | null;
  totalCapacityTb: number | null;
  usedCapacityTb: number | null;
  unusedCapacityTb: number | null;
  allocatedCapacityTb: number | null;
  remarks: string | null;
  rawValues: Record<string, unknown>;
}

export interface StorageColumnMap {
  deviceName: number;
  oem?: number;
  model?: number;
  totalCapacityTb: number;
  usedCapacityTb: number;
  unusedCapacityTb?: number;
  allocatedCapacityTb: number;
  remarks?: number;
}

export interface WorkbookPreviewSection {
  name: string;
  rowCount: number;
  previewRows: string[][];
}

export interface WorkbookParseResult {
  preview: {
    sheets: WorkbookPreviewSection[];
  };
  deployments: ParsedProjectDeploymentRow[];
  storageAssets: ParsedStorageAssetRow[];
  issues: WorkbookIssue[];
  summary: Record<string, unknown>;
}
