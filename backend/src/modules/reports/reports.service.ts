import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';

import { Report } from '../../entities/report.entity';
import { ProjectDeployment } from '../../entities/project-deployment.entity';
import { StorageAsset } from '../../entities/storage-asset.entity';
import { ImportBatch } from '../../entities/import-batch.entity';
import { GenerateReportDto } from './dto/generate-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private reportRepo: Repository<Report>,

    @InjectRepository(ProjectDeployment)
    private deploymentRepo: Repository<ProjectDeployment>,

    @InjectRepository(StorageAsset)
    private assetRepo: Repository<StorageAsset>,

    @InjectRepository(ImportBatch)
    private batchRepo: Repository<ImportBatch>,
  ) {}

  async generateReport(body: GenerateReportDto) {
    const { type, format, title } = body;

    const activeBatch = await this.batchRepo.findOne({
      where: { isActive: true },
    });
    if (!activeBatch) {
      throw new BadRequestException('No active import snapshot found');
    }

    let data: any[] = [];

    if (type === 'analytics') {
      data = await this.deploymentRepo.find({
        where: { batch: { id: activeBatch.id } },
        relations: ['project'],
      });
    }

    if (type === 'capacity') {
      data = await this.assetRepo.find({
        where: { batch: { id: activeBatch.id } },
        relations: ['location'],
      });
    }

    const fileName = `${type}-report-${Date.now()}.${format}`;
    const filePath = path.join('uploads', fileName);

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(title || 'Report');

      if (type === 'analytics') {
        sheet.columns = [
          { header: 'Project', key: 'project' },
          { header: 'Environment', key: 'env' },
          { header: 'Workload', key: 'workload' },
          { header: 'VMs', key: 'vms' },
          { header: 'CPU', key: 'cpu' },
          { header: 'RAM (GB)', key: 'ram' },
        ];

        data.forEach((d) => {
          sheet.addRow({
            project: d.project?.displayName,
            env: d.environmentType,
            workload: d.workloadType,
            vms: d.vmQuantity || d.totalVms || 0,
            cpu: d.totalCpu,
            ram: d.totalRamGb,
          });
        });
      }

      if (type === 'capacity') {
        sheet.columns = [
          { header: 'Location', key: 'loc' },
          { header: 'Device', key: 'device' },
          { header: 'Total (TB)', key: 'total' },
          { header: 'Used (TB)', key: 'used' },
          { header: 'Unused (TB)', key: 'unused' },
        ];

        data.forEach((d) => {
          sheet.addRow({
            loc: d.location?.code,
            device: d.deviceName,
            total: d.totalCapacityTb,
            used: d.usedCapacityTb,
            unused: d.unusedCapacityTb,
          });
        });
      }

      await workbook.xlsx.writeFile(filePath);
    }

    if (format === 'csv') {
      let csv = '';

      if (type === 'analytics') {
        csv += 'Project,Environment,Workload,VMs,CPU,RAM(GB)\n';
        data.forEach((d) => {
          csv += `${d.project?.displayName},${d.environmentType},${d.workloadType},${d.vmQuantity || d.totalVms || 0},${d.totalCpu},${d.totalRamGb}\n`;
        });
      }

      if (type === 'capacity') {
        csv += 'Location,Device,Total(TB),Used(TB),Unused(TB)\n';
        data.forEach((d) => {
          csv += `${d.location?.code},${d.deviceName},${d.totalCapacityTb},${d.usedCapacityTb},${d.unusedCapacityTb}\n`;
        });
      }

      fs.writeFileSync(filePath, csv);
    }

    if (format === 'pdf') {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      doc.fontSize(16).text(title || `${type} Report`, { align: 'center' });
      doc.moveDown();

      data.forEach((d) => {
        doc.text(JSON.stringify(d));
        doc.moveDown();
      });

      doc.end();
    }

    const report = await this.reportRepo.save({
      file_name: fileName,
      file_path: filePath,
      type: format,
    });

    return {
      success: true,
      data: report,
    };
  }

  async findAll() {
    const reports = await this.reportRepo.find({
      order: { created_at: 'DESC' },
    });

    return {
      success: true,
      data: reports,
    };
  }

  async download(id: number) {
    const report = await this.reportRepo.findOne({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report.file_path;
  }

  async remove(id: number) {
    const report = await this.reportRepo.findOne({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (fs.existsSync(report.file_path)) {
      fs.unlinkSync(report.file_path);
    }

    await this.reportRepo.delete(id);

    return {
      success: true,
      message: 'Report deleted',
    };
  }
}
