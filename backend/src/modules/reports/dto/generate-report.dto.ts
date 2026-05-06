import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum ReportType {
  METRICS = 'metrics',
  ANALYTICS = 'analytics',
  ALERTS = 'alerts',
  CAPACITY = 'capacity',
}

export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  XLSX = 'xlsx',
}

export class GenerateReportDto {
  @IsEnum(ReportType)
  type: ReportType;

  @IsEnum(ReportFormat)
  format: ReportFormat;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  title?: string;
}
