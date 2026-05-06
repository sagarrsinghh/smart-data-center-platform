import { Injectable } from '@nestjs/common';

import {
  ParsedStorageAssetRow,
  StorageColumnMap,
  WorkbookIssue,
} from './workbook-import.types';

type RowValue = string | number | boolean | Date;

@Injectable()
export class StorageUtilizationParser {
  readonly sheetName = 'Storage Utiliz. Report 30-01-26';

  parse(rows: RowValue[][]): {
    assets: ParsedStorageAssetRow[];
    issues: WorkbookIssue[];
  };
  parse(
    rows: RowValue[][],
    options?: {
      sheetName?: string;
      headerRowIndex?: number;
      columns?: StorageColumnMap;
    },
  ): {
    assets: ParsedStorageAssetRow[];
    issues: WorkbookIssue[];
  };
  parse(
    rows: RowValue[][],
    options?: {
      sheetName?: string;
      headerRowIndex?: number;
      columns?: StorageColumnMap;
    },
  ): {
    assets: ParsedStorageAssetRow[];
    issues: WorkbookIssue[];
  } {
    const sourceSheet = options?.sheetName ?? this.sheetName;
    const assets: ParsedStorageAssetRow[] = [];
    const issues: WorkbookIssue[] = [];
    const detectedHeader = this.detectHeader(rows);
    const columns = options?.columns ?? detectedHeader.columns;

    if (!columns) {
      return {
        assets,
        issues: [
          {
            severity: 'error',
            scope: 'storage-sheet',
            sourceSheet,
            message:
              'Storage workbook header row could not be detected. Required columns: Device Name, Total Capacity, Used Capacity, Allocated Capacity.',
          },
        ],
      };
    }

    let currentLocationCode = '';

    rows.forEach((row, index) => {
      const sourceRowNumber = index + 1;
      const firstCell = this.clean(this.valueAt(row, columns.deviceName));

      if (this.isRowEmpty(row)) {
        return;
      }

      const firstPhysicalCell = this.clean(row[0]);

      if (/^RSDC-/i.test(firstPhysicalCell)) {
        currentLocationCode = firstPhysicalCell.toUpperCase();
        return;
      }

      if (/^RSDC-/i.test(firstCell)) {
        currentLocationCode = firstCell.toUpperCase();
        return;
      }

      if (
        this.isHeaderRow(row, columns) ||
        firstCell.toUpperCase() === 'TOTAL' ||
        firstCell.toUpperCase() === 'PROJECT'
      ) {
        return;
      }

      if (!currentLocationCode) {
        issues.push({
          severity: 'warning',
          scope: 'storage-sheet',
          sourceSheet,
          sourceRowNumber,
          message:
            'Skipped storage row because no active location section was detected.',
          details: { row: row.slice(0, 8) },
        });
        return;
      }

      assets.push({
        sourceSheet,
        sourceRowNumber,
        locationCode: currentLocationCode,
        deviceName: firstCell,
        oem: this.toNullableString(this.valueAt(row, columns.oem)),
        model: this.toNullableString(this.valueAt(row, columns.model)),
        totalCapacityTb: this.toNumber(
          this.valueAt(row, columns.totalCapacityTb),
        ),
        usedCapacityTb: this.toNumber(
          this.valueAt(row, columns.usedCapacityTb),
        ),
        unusedCapacityTb: this.toNumber(
          this.valueAt(row, columns.unusedCapacityTb),
        ),
        allocatedCapacityTb: this.toNumber(
          this.valueAt(row, columns.allocatedCapacityTb),
        ),
        remarks: this.toNullableString(this.valueAt(row, columns.remarks)),
        rawValues: {
          deviceName: firstCell,
          oem: this.clean(this.valueAt(row, columns.oem)) || null,
          model: this.clean(this.valueAt(row, columns.model)) || null,
          totalCapacityTb:
            this.clean(this.valueAt(row, columns.totalCapacityTb)) || null,
          usedCapacityTb:
            this.clean(this.valueAt(row, columns.usedCapacityTb)) || null,
          unusedCapacityTb:
            this.clean(this.valueAt(row, columns.unusedCapacityTb)) || null,
          allocatedCapacityTb:
            this.clean(this.valueAt(row, columns.allocatedCapacityTb)) || null,
          remarks: this.clean(this.valueAt(row, columns.remarks)) || null,
        },
      });
    });

    return { assets, issues };
  }

  detectHeader(rows: RowValue[][]): {
    rowIndex: number;
    columns?: StorageColumnMap;
    score: number;
    missing: string[];
  } {
    let best = {
      rowIndex: -1,
      columns: undefined as StorageColumnMap | undefined,
      score: 0,
      missing: [
        'Device Name',
        'Total Capacity',
        'Used Capacity',
        'Allocated Capacity',
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
            missing.length === 0 ? (columns as StorageColumnMap) : undefined,
          score,
          missing,
        };
      }
    });

    return best;
  }

  private mapColumns(row: RowValue[]): Partial<StorageColumnMap> {
    return row.reduce<Partial<StorageColumnMap>>((columns, cell, index) => {
      const normalized = this.normalize(cell);

      if (['devicename', 'device'].includes(normalized)) {
        columns.deviceName = index;
      } else if (normalized === 'oem') {
        columns.oem = index;
      } else if (normalized === 'model') {
        columns.model = index;
      } else if (['totalcapacitytb', 'totalcapacity'].includes(normalized)) {
        columns.totalCapacityTb = index;
      } else if (['usedcapacitytb', 'usedcapacity'].includes(normalized)) {
        columns.usedCapacityTb = index;
      } else if (['unusedcapacitytb', 'unusedcapacity'].includes(normalized)) {
        columns.unusedCapacityTb = index;
      } else if (
        ['allocatedcapacitytb', 'allocatedcapacity'].includes(normalized)
      ) {
        columns.allocatedCapacityTb = index;
      } else if (normalized === 'remarks' || normalized === 'remark') {
        columns.remarks = index;
      }

      return columns;
    }, {});
  }

  private requiredColumns(columns: Partial<StorageColumnMap>) {
    const missing: string[] = [];

    if (columns.deviceName === undefined) missing.push('Device Name');
    if (columns.totalCapacityTb === undefined) missing.push('Total Capacity');
    if (columns.usedCapacityTb === undefined) missing.push('Used Capacity');
    if (columns.allocatedCapacityTb === undefined) {
      missing.push('Allocated Capacity');
    }

    return missing;
  }

  private scoreColumns(columns: Partial<StorageColumnMap>) {
    return [
      columns.deviceName,
      columns.oem,
      columns.model,
      columns.totalCapacityTb,
      columns.usedCapacityTb,
      columns.unusedCapacityTb,
      columns.allocatedCapacityTb,
      columns.remarks,
    ].filter((value) => value !== undefined).length;
  }

  private isHeaderRow(row: RowValue[], columns: StorageColumnMap) {
    return (
      this.normalize(this.valueAt(row, columns.deviceName)) === 'devicename' &&
      this.normalize(this.valueAt(row, columns.totalCapacityTb)).startsWith(
        'totalcapacity',
      )
    );
  }

  private clean(value: unknown) {
    return String(value ?? '').trim();
  }

  private normalize(value: unknown) {
    return this.clean(value)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  private valueAt(row: RowValue[], index?: number) {
    return index === undefined ? '' : row[index];
  }

  private toNullableString(value: unknown) {
    const cleaned = this.clean(value);
    return cleaned || null;
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
