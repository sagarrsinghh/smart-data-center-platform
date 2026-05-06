import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

import {
  StorageColumnMap,
  VmCoreRamColumnMap,
  WorkbookIssue,
  WorkbookParseResult,
  WorkbookPreviewSection,
} from './workbook-import.types';
import { StorageUtilizationParser } from './storage-utilization.parser';
import { VmCoreRamParser } from './vm-core-ram.parser';

type RowValue = string | number | boolean | Date;

interface SheetRows {
  name: string;
  rows: RowValue[][];
}

interface SheetMatch<TColumns> {
  name: string;
  rows: RowValue[][];
  headerRowIndex: number;
  columns: TColumns;
  score: number;
  strategy: 'official-name' | 'prefix-name' | 'column-match';
}

@Injectable()
export class WorkbookImportParser {
  constructor(
    private readonly vmParser: VmCoreRamParser,
    private readonly storageParser: StorageUtilizationParser,
  ) {}

  parse(filePath: string): WorkbookParseResult {
    const workbook = XLSX.readFile(filePath, {
      cellDates: true,
      raw: false,
    });

    const issues: WorkbookIssue[] = [];
    const sheetRows = workbook.SheetNames.map((sheetName) => ({
      name: sheetName,
      rows: this.readRows(workbook.Sheets[sheetName]),
    }));
    const sheets = sheetRows.map(({ name, rows }) => {
      return this.toPreviewSection(name, rows);
    });

    const vmMatch = this.findVmSheet(sheetRows, issues);
    const storageMatch = this.findStorageSheet(sheetRows, issues);

    if (!vmMatch) {
      const missingVmIssue: WorkbookIssue = {
        severity: 'error',
        scope: 'workbook',
        message:
          `VM sheet could not be detected. Expected "${this.vmParser.sheetName}" ` +
          'or a sheet containing PROJECT, PROD / STAG, APP / DB, VM-QUANTITY, CORE, and RAM columns.',
      };
      issues.push(missingVmIssue);
    }

    if (!storageMatch) {
      const missingStorageIssue: WorkbookIssue = {
        severity: 'error',
        scope: 'workbook',
        message:
          'Storage sheet could not be detected. Expected a sheet named like ' +
          '"Storage Utiliz. Report ..." or a sheet containing Device Name, OEM, Model, Total Capacity, Used Capacity, and Allocated Capacity columns.',
      };
      issues.push(missingStorageIssue);
    }

    const vmResult = vmMatch
      ? this.vmParser.parse(vmMatch.rows, {
          sheetName: vmMatch.name,
          headerRowIndex: vmMatch.headerRowIndex,
          columns: vmMatch.columns,
        })
      : { deployments: [], issues: [] };
    const storageResult = storageMatch
      ? this.storageParser.parse(storageMatch.rows, {
          sheetName: storageMatch.name,
          headerRowIndex: storageMatch.headerRowIndex,
          columns: storageMatch.columns,
        })
      : { assets: [], issues: [] };

    issues.push(...vmResult.issues, ...storageResult.issues);

    const projectCount = new Set(
      vmResult.deployments.map(
        (deployment) => deployment.projectNormalizedName,
      ),
    ).size;

    const summary = {
      projectCount,
      deploymentCount: vmResult.deployments.length,
      storageAssetCount: storageResult.assets.length,
      warningCount: issues.filter((issue) => issue.severity === 'warning')
        .length,
      errorCount: issues.filter((issue) => issue.severity === 'error').length,
      totals: this.buildTotals(vmResult.deployments, storageResult.assets),
    };

    return {
      preview: { sheets },
      deployments: vmResult.deployments,
      storageAssets: storageResult.assets,
      issues,
      summary,
    };
  }

  private readRows(worksheet: XLSX.WorkSheet) {
    return XLSX.utils.sheet_to_json<(string | number | boolean | Date)[]>(
      worksheet,
      {
        header: 1,
        defval: '',
        raw: false,
      },
    );
  }

  private findVmSheet(
    sheets: SheetRows[],
    issues: WorkbookIssue[],
  ): SheetMatch<VmCoreRamColumnMap> | null {
    const officialSheet = sheets.find(
      (sheet) => sheet.name === this.vmParser.sheetName,
    );

    if (officialSheet) {
      const detected = this.vmParser.detectHeader(officialSheet.rows);
      if (detected.columns) {
        return {
          name: officialSheet.name,
          rows: officialSheet.rows,
          headerRowIndex: detected.rowIndex,
          columns: detected.columns,
          score: detected.score,
          strategy: 'official-name',
        };
      }
    }

    const matches = sheets
      .map((sheet) => {
        const detected = this.vmParser.detectHeader(sheet.rows);
        if (!detected.columns) {
          return null;
        }

        return {
          name: sheet.name,
          rows: sheet.rows,
          headerRowIndex: detected.rowIndex,
          columns: detected.columns,
          score: detected.score,
          strategy: 'column-match' as const,
        } as SheetMatch<VmCoreRamColumnMap>;
      })
      .filter((match): match is SheetMatch<VmCoreRamColumnMap> =>
        Boolean(match),
      )
      .sort((left, right) => right.score - left.score);

    this.warnIfAmbiguous('VM', matches, issues);
    return matches[0] ?? null;
  }

  private findStorageSheet(
    sheets: SheetRows[],
    issues: WorkbookIssue[],
  ): SheetMatch<StorageColumnMap> | null {
    const prefixMatches = sheets
      .filter((sheet) =>
        sheet.name.toLowerCase().startsWith('storage utiliz. report'),
      )
      .map((sheet) => this.toStorageMatch(sheet, 'prefix-name'))
      .filter((match): match is SheetMatch<StorageColumnMap> => Boolean(match))
      .sort((left, right) => right.score - left.score);

    if (prefixMatches.length) {
      this.warnIfAmbiguous('storage', prefixMatches, issues);
      return prefixMatches[0];
    }

    const matches = sheets
      .map((sheet) => this.toStorageMatch(sheet, 'column-match'))
      .filter((match): match is SheetMatch<StorageColumnMap> => Boolean(match))
      .sort((left, right) => right.score - left.score);

    this.warnIfAmbiguous('storage', matches, issues);
    return matches[0] ?? null;
  }

  private toStorageMatch(
    sheet: SheetRows,
    strategy: SheetMatch<StorageColumnMap>['strategy'],
  ): SheetMatch<StorageColumnMap> | null {
    const detected = this.storageParser.detectHeader(sheet.rows);
    if (!detected.columns) {
      return null;
    }

    return {
      name: sheet.name,
      rows: sheet.rows,
      headerRowIndex: detected.rowIndex,
      columns: detected.columns,
      score: detected.score,
      strategy,
    };
  }

  private warnIfAmbiguous<TColumns>(
    label: string,
    matches: SheetMatch<TColumns>[],
    issues: WorkbookIssue[],
  ) {
    if (matches.length < 2 || matches[0].score !== matches[1].score) {
      return;
    }

    issues.push({
      severity: 'warning',
      scope: 'workbook',
      message:
        `Multiple ${label} sheets matched with the same confidence. ` +
        `Using "${matches[0].name}". Other candidates: ${matches
          .slice(1)
          .map((match) => `"${match.name}"`)
          .join(', ')}.`,
      details: {
        selectedSheet: matches[0].name,
        candidates: matches.map((match) => ({
          name: match.name,
          score: match.score,
          strategy: match.strategy,
        })),
      },
    });
  }

  private toPreviewSection(
    name: string,
    rows: (string | number | boolean | Date)[][],
  ): WorkbookPreviewSection {
    return {
      name,
      rowCount: rows.length,
      previewRows: rows
        .slice(0, 12)
        .map((row) => row.map((cell) => String(cell ?? '').trim())),
    };
  }

  private buildTotals(
    deployments: WorkbookParseResult['deployments'],
    storageAssets: WorkbookParseResult['storageAssets'],
  ) {
    return {
      totalVmQuantity: deployments.reduce(
        (sum, row) => sum + Number(row.vmQuantity || 0),
        0,
      ),
      totalCore: Number(
        deployments
          .reduce((sum, row) => sum + Number(row.core || 0), 0)
          .toFixed(2),
      ),
      totalRamGb: Number(
        deployments
          .reduce((sum, row) => sum + Number(row.ramGb || 0), 0)
          .toFixed(2),
      ),
      totalProjectVms: deployments.reduce(
        (sum, row) => sum + Number(row.totalVms || 0),
        0,
      ),
      totalProjectCpu: Number(
        deployments
          .reduce((sum, row) => sum + Number(row.totalCpu || 0), 0)
          .toFixed(2),
      ),
      totalProjectRamGb: Number(
        deployments
          .reduce((sum, row) => sum + Number(row.totalRamGb || 0), 0)
          .toFixed(2),
      ),
      totalStorageTb: Number(
        storageAssets
          .reduce((sum, row) => sum + Number(row.totalCapacityTb || 0), 0)
          .toFixed(3),
      ),
      usedStorageTb: Number(
        storageAssets
          .reduce((sum, row) => sum + Number(row.usedCapacityTb || 0), 0)
          .toFixed(3),
      ),
    };
  }
}
