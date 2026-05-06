import { Injectable } from '@nestjs/common';

import {
  ParsedProjectDeploymentRow,
  VmCoreRamColumnMap,
  WorkbookIssue,
} from './workbook-import.types';

type RowValue = string | number | boolean | Date;

@Injectable()
export class VmCoreRamParser {
  readonly sheetName = 'VM-CORE-RAM with location wise';

  parse(rows: RowValue[][]): {
    deployments: ParsedProjectDeploymentRow[];
    issues: WorkbookIssue[];
  };
  parse(
    rows: RowValue[][],
    options?: {
      sheetName?: string;
      headerRowIndex?: number;
      columns?: VmCoreRamColumnMap;
    },
  ): {
    deployments: ParsedProjectDeploymentRow[];
    issues: WorkbookIssue[];
  };
  parse(
    rows: RowValue[][],
    options?: {
      sheetName?: string;
      headerRowIndex?: number;
      columns?: VmCoreRamColumnMap;
    },
  ): {
    deployments: ParsedProjectDeploymentRow[];
    issues: WorkbookIssue[];
  } {
    const sourceSheet = options?.sheetName ?? this.sheetName;
    const issues: WorkbookIssue[] = [];
    const deployments: ParsedProjectDeploymentRow[] = [];
    const detectedHeader = this.detectHeader(rows);
    const headerRowIndex = options?.headerRowIndex ?? detectedHeader.rowIndex;
    const columns = options?.columns ?? detectedHeader.columns;

    if (headerRowIndex < 0 || !columns) {
      return {
        deployments,
        issues: [
          {
            severity: 'error',
            scope: 'vm-sheet',
            sourceSheet,
            message:
              'VM workbook header row could not be detected. Required columns: PROJECT, PROD / STAG, APP / DB, VM-QUANTITY, CORE, RAM.',
          },
        ],
      };
    }

    let currentProjectName = '';

    rows.slice(headerRowIndex + 1).forEach((row, index) => {
      const sourceRowNumber = headerRowIndex + index + 2;
      const firstCell = this.clean(this.valueAt(row, columns.srNo));
      const secondCell = this.clean(this.valueAt(row, columns.project));
      const envRaw = this.clean(this.valueAt(row, columns.environment));
      const workload = this.clean(
        this.valueAt(row, columns.workload),
      ).toUpperCase();

      if (this.isRowEmpty(row)) {
        return;
      }

      if (this.isSummaryOnlyRow(firstCell, secondCell, envRaw, workload)) {
        return;
      }

      if (secondCell) {
        currentProjectName = secondCell;
      }

      if (!currentProjectName) {
        issues.push({
          severity: 'warning',
          scope: 'vm-sheet',
          sourceSheet,
          sourceRowNumber,
          message: 'Skipped VM row because project name could not be resolved.',
          details: { row: row.slice(0, 10) },
        });
        return;
      }

      if (!envRaw || !workload) {
        issues.push({
          severity: 'warning',
          scope: 'vm-sheet',
          sourceSheet,
          sourceRowNumber,
          message:
            'Skipped VM row because environment or workload type is missing.',
          details: { project: currentProjectName, envRaw, workload },
        });
        return;
      }

      const environment = this.parseEnvironment(envRaw);
      if (environment.warning) {
        issues.push({
          severity: 'warning',
          scope: 'vm-sheet',
          sourceSheet,
          sourceRowNumber,
          message: environment.warning,
          details: { project: currentProjectName, envRaw },
        });
      }

      if (!['APP', 'DB'].includes(workload)) {
        issues.push({
          severity: 'warning',
          scope: 'vm-sheet',
          sourceSheet,
          sourceRowNumber,
          message: 'Skipped VM row because workload type is not APP or DB.',
          details: { project: currentProjectName, workload },
        });
        return;
      }

      deployments.push({
        sourceSheet,
        sourceRowNumber,
        projectName: currentProjectName,
        projectNormalizedName: this.normalizeProjectName(currentProjectName),
        environmentRaw: envRaw,
        environmentType: environment.environmentType,
        locationCode: environment.locationCode,
        workloadType: workload,
        vmQuantity: this.toNumber(this.valueAt(row, columns.vmQuantity)),
        totalVms: this.toNumber(this.valueAt(row, columns.totalVms)),
        core: this.toNumber(this.valueAt(row, columns.core)),
        totalCpu: this.toNumber(this.valueAt(row, columns.totalCpu)),
        ramGb: this.toNumber(this.valueAt(row, columns.ramGb)),
        totalRamGb: this.toNumber(this.valueAt(row, columns.totalRamGb)),
        rawValues: {
          srNo: firstCell || null,
          project: currentProjectName,
          environmentRaw: envRaw,
          workloadType: workload,
          vmQuantity: this.clean(this.valueAt(row, columns.vmQuantity)) || null,
          totalVms: this.clean(this.valueAt(row, columns.totalVms)) || null,
          core: this.clean(this.valueAt(row, columns.core)) || null,
          totalCpu: this.clean(this.valueAt(row, columns.totalCpu)) || null,
          ramGb: this.clean(this.valueAt(row, columns.ramGb)) || null,
          totalRamGb: this.clean(this.valueAt(row, columns.totalRamGb)) || null,
        },
      });
    });

    return { deployments, issues };
  }

  detectHeader(rows: RowValue[][]): {
    rowIndex: number;
    columns?: VmCoreRamColumnMap;
    score: number;
    missing: string[];
  } {
    let best = {
      rowIndex: -1,
      columns: undefined as VmCoreRamColumnMap | undefined,
      score: 0,
      missing: [
        'PROJECT',
        'PROD / STAG',
        'APP / DB',
        'VM-QUANTITY',
        'CORE',
        'RAM',
      ],
    };

    rows.forEach((row, rowIndex) => {
      const columns = this.mapColumns(row);
      const missing = this.requiredColumns(columns);
      const score = this.scoreColumns(columns);

      if (score > best.score) {
        best = {
          rowIndex,
          columns:
            missing.length === 0 ? (columns as VmCoreRamColumnMap) : undefined,
          score,
          missing,
        };
      }
    });

    return best;
  }

  private mapColumns(row: RowValue[]): Partial<VmCoreRamColumnMap> {
    return row.reduce<Partial<VmCoreRamColumnMap>>((columns, cell, index) => {
      const normalized = this.normalize(cell);

      if (['srno', 'sno', 'serialno'].includes(normalized)) {
        columns.srNo = index;
      } else if (normalized === 'project') {
        columns.project = index;
      } else if (
        ['prodstag', 'prodstage', 'environment', 'env'].includes(normalized)
      ) {
        columns.environment = index;
      } else if (['appdb', 'workload', 'workloadtype'].includes(normalized)) {
        columns.workload = index;
      } else if (['vmquantity', 'vmqty', 'vmcount'].includes(normalized)) {
        columns.vmQuantity = index;
      } else if (
        ['totalvms', 'totalvm', 'totalvmquantity'].includes(normalized)
      ) {
        columns.totalVms = index;
      } else if (['core', 'cpu', 'cpucount'].includes(normalized)) {
        columns.core = index;
      } else if (['totalcpu', 'totalcore', 'totalcores'].includes(normalized)) {
        columns.totalCpu = index;
      } else if (['ramgb', 'ram', 'memorygb'].includes(normalized)) {
        columns.ramGb = index;
      } else if (
        ['totalram', 'totalramgb', 'totalmemorygb'].includes(normalized)
      ) {
        columns.totalRamGb = index;
      }

      return columns;
    }, {});
  }

  private requiredColumns(columns: Partial<VmCoreRamColumnMap>) {
    const missing: string[] = [];

    if (columns.project === undefined) missing.push('PROJECT');
    if (columns.environment === undefined) missing.push('PROD / STAG');
    if (columns.workload === undefined) missing.push('APP / DB');
    if (columns.vmQuantity === undefined) missing.push('VM-QUANTITY');
    if (columns.core === undefined) missing.push('CORE');
    if (columns.ramGb === undefined) missing.push('RAM');

    return missing;
  }

  private scoreColumns(columns: Partial<VmCoreRamColumnMap>) {
    return [
      columns.srNo,
      columns.project,
      columns.environment,
      columns.workload,
      columns.vmQuantity,
      columns.totalVms,
      columns.core,
      columns.totalCpu,
      columns.ramGb,
      columns.totalRamGb,
    ].filter((value) => value !== undefined).length;
  }

  private isSummaryOnlyRow(
    firstCell: string,
    secondCell: string,
    envRaw: string,
    workload: string,
  ) {
    if (firstCell === '523' && secondCell === 'Total') {
      return true;
    }

    if (secondCell === 'Total') {
      return true;
    }

    if (firstCell === '-' || secondCell === '-' || firstCell === 'Project') {
      return true;
    }

    if (
      !envRaw &&
      !workload &&
      secondCell &&
      !/^[A-Za-z0-9(]/.test(secondCell)
    ) {
      return true;
    }

    return false;
  }

  private parseEnvironment(rawValue: string) {
    const normalized = rawValue.toUpperCase().replace(/_/g, '-').trim();

    if (normalized === 'DR') {
      return {
        environmentType: 'DR',
        locationCode: 'DR',
      };
    }

    const [environmentTypeRaw, locationRaw] = normalized.split('-');

    if (!environmentTypeRaw || !locationRaw) {
      return {
        environmentType: normalized || 'UNKNOWN',
        locationCode: 'UNKNOWN',
        warning:
          'Environment value could not be cleanly split into environment and location.',
      };
    }

    return {
      environmentType: environmentTypeRaw,
      locationCode: locationRaw,
    };
  }

  private normalizeProjectName(value: string) {
    return this.clean(value).toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private normalize(value: unknown) {
    return this.clean(value)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  private valueAt(row: RowValue[], index?: number) {
    return index === undefined ? '' : row[index];
  }

  private clean(value: unknown) {
    return String(value ?? '').trim();
  }

  private toNumber(value: unknown) {
    const cleaned = this.clean(value);
    if (!cleaned) {
      return null;
    }

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private isRowEmpty(row: RowValue[]) {
    return row.every((value) => !this.clean(value));
  }
}
