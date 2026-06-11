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
      const doc = new PDFDocument({ margin: 40 });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // 1. Draw solid Header Banner
      const isAnalytics = type === 'analytics';
      const bannerColor = isAnalytics ? '#1e3a8a' : '#064e3b';
      
      doc.rect(0, 0, 612, 90).fill(bannerColor);
      
      // Header Text
      doc.fillColor('#ffffff')
         .fontSize(20)
         .font('Helvetica-Bold')
         .text('SMART DATA CENTER MONITORING SUITE', 40, 25);
      
      doc.fontSize(11)
         .font('Helvetica')
         .text(
           isAnalytics 
             ? 'PROJECT DEPLOYMENTS & COMPUTE SUMMARY REPORT' 
             : 'PHYSICAL STORAGE ASSET CAPACITY & RISK REPORT', 
           40, 52
         );

      doc.fillColor('#334155'); // Reset fill color to slate dark
      doc.moveDown(4);

      // Title & Generation Metadata
      doc.fontSize(14).font('Helvetica-Bold').text(title || `${isAnalytics ? 'Compute Baseline' : 'Storage Capacity'} Report`, 40, 115);
      doc.fontSize(9).font('Helvetica').fillColor('#64748b')
         .text(`Generated on: ${new Date().toLocaleString('en-IN')}  |  Snapshot Batch ID: #${activeBatch.id}`, 40, 135);
      
      doc.moveTo(40, 150).lineTo(572, 150).stroke('#e2e8f0');
      doc.moveDown(2);

      // 2. Summary Dashboard Section
      doc.y = 165;
      doc.rect(40, 160, 532, 60).fill('#f8fafc').stroke('#cbd5e1');
      doc.fillColor('#334155');

      if (isAnalytics) {
        const totalVms = data.reduce((sum, d) => sum + Number(d.vmQuantity || d.totalVms || 0), 0);
        const totalCpu = data.reduce((sum, d) => sum + Number(d.totalCpu || 0), 0);
        const totalRam = data.reduce((sum, d) => sum + Number(d.totalRamGb || 0), 0);

        doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b')
           .text('TOTAL DEPLOYMENTS', 55, 175)
           .text('AGGREGATED VMS', 190, 175)
           .text('TOTAL CPU CORES', 320, 175)
           .text('TOTAL RAM (GB)', 450, 175);

        doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e3a8a')
           .text(String(data.length), 55, 192)
           .text(String(totalVms), 190, 192)
           .text(String(totalCpu.toFixed(0)), 320, 192)
           .text(String(totalRam.toFixed(0)), 450, 192);
      } else {
        const totalCap = data.reduce((sum, d) => sum + Number(d.totalCapacityTb || 0), 0);
        const usedCap = data.reduce((sum, d) => sum + Number(d.usedCapacityTb || 0), 0);
        const allocatedCap = data.reduce((sum, d) => sum + Number(d.allocatedCapacityTb || 0), 0);
        const avgStress = totalCap > 0 ? (allocatedCap / totalCap) * 100 : 0;

        doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b')
           .text('TOTAL ARRAYS', 55, 175)
           .text('PHYSICAL HEADROOM', 190, 175)
           .text('TOTAL ALLOCATED', 325, 175)
           .text('THIN PROVISION INDEX', 450, 175);

        doc.fontSize(14).font('Helvetica-Bold').fillColor('#064e3b')
           .text(String(data.length), 55, 192)
           .text(`${totalCap.toFixed(1)} TB`, 190, 192)
           .text(`${allocatedCap.toFixed(1)} TB`, 325, 192)
           .text(`${avgStress.toFixed(0)}%`, 450, 192);
      }

      doc.fillColor('#334155');
      doc.y = 240;

      // 3. Draw Table headers
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569');
      if (isAnalytics) {
        doc.text('PROJECT NAME', 45, 245);
        doc.text('ENV', 230, 245);
        doc.text('TYPE', 285, 245);
        doc.text('VMS', 350, 245);
        doc.text('CPU', 410, 245);
        doc.text('RAM (GB)', 480, 245);
      } else {
        doc.text('DEVICE NAME', 45, 245);
        doc.text('LOC', 210, 245);
        doc.text('OEM / MODEL', 265, 245);
        doc.text('TOTAL', 375, 245);
        doc.text('USED', 440, 245);
        doc.text('ALLOCATED', 500, 245);
      }

      doc.moveTo(40, 258).lineTo(572, 258).stroke('#94a3b8');

      // 4. Draw Rows dynamically
      let rowY = 265;
      doc.fontSize(8.5).font('Helvetica').fillColor('#334155');

      data.forEach((d: any) => {
        // Page break checker
        if (rowY > 720) {
          doc.addPage({ margin: 40 });
          // Redraw header block mini
          doc.rect(0, 0, 612, 40).fill(bannerColor);
          doc.fillColor('#ffffff')
             .fontSize(10)
             .font('Helvetica-Bold')
             .text('SMART DATA CENTER SUITE  |  REPORT ARCHIVE', 40, 15);
          
          doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#475569');
          doc.y = 60;
          if (isAnalytics) {
            doc.text('PROJECT NAME', 45, 60);
            doc.text('ENV', 230, 60);
            doc.text('TYPE', 285, 60);
            doc.text('VMS', 350, 60);
            doc.text('CPU', 410, 60);
            doc.text('RAM (GB)', 480, 60);
          } else {
            doc.text('DEVICE NAME', 45, 60);
            doc.text('LOC', 210, 60);
            doc.text('OEM / MODEL', 265, 60);
            doc.text('TOTAL', 375, 60);
            doc.text('USED', 440, 60);
            doc.text('ALLOCATED', 500, 60);
          }
          doc.moveTo(40, 72).lineTo(572, 72).stroke('#94a3b8');
          rowY = 80;
          doc.font('Helvetica').fillColor('#334155');
        }

        // Draw Row values
        if (isAnalytics) {
          doc.text(d.project?.displayName || d.projectNormalizedName || 'N/A', 45, rowY, { width: 175, ellipsis: true });
          doc.text(d.environmentType || '-', 230, rowY);
          doc.text(d.workloadType || '-', 285, rowY);
          doc.text(String(d.vmQuantity || d.totalVms || 0), 350, rowY);
          doc.text(String(d.totalCpu), 410, rowY);
          doc.text(String(d.totalRamGb), 480, rowY);
        } else {
          doc.text(d.deviceName || '-', 45, rowY, { width: 155, ellipsis: true });
          doc.text(d.location?.code || '-', 210, rowY);
          doc.text(`${d.oem || ''} ${d.model || ''}`.trim() || '-', 265, rowY, { width: 100, ellipsis: true });
          doc.text(`${Number(d.totalCapacityTb || 0).toFixed(1)} TB`, 375, rowY);
          doc.text(`${Number(d.usedCapacityTb || 0).toFixed(1)} TB`, 440, rowY);
          doc.text(`${Number(d.allocatedCapacityTb || 0).toFixed(1)} TB`, 500, rowY);
        }

        // Row border
        doc.moveTo(40, rowY + 14).lineTo(572, rowY + 14).stroke('#f1f5f9');
        rowY += 20;
      });

      // Footer page numbering
      const pages = doc._pageBuffer || [];
      pages.forEach((_, i) => {
        doc.switchToPage(i);
        doc.fontSize(8)
           .fillColor('#94a3b8')
           .text(
             `Page ${i + 1} of ${pages.length}  |  Confidential  |  Smart Data Center Suite`,
             40, 755, { align: 'center' }
           );
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
