import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import { DataSource, Repository } from 'typeorm';

import { ImportBatch } from '../../entities/import-batch.entity';
import { ImportIssue } from '../../entities/import-issue.entity';
import { ProjectDeployment } from '../../entities/project-deployment.entity';
import { Project } from '../../entities/project.entity';
import { StorageAsset } from '../../entities/storage-asset.entity';
import { StorageLocation } from '../../entities/storage-location.entity';
import { NotificationsService } from './notifications.service';
import { WorkbookImportParser } from './parsers/workbook-import.parser';

@Injectable()
export class InfraImportsService {
  constructor(
    private readonly workbookParser: WorkbookImportParser,
    private readonly dataSource: DataSource,
    @InjectRepository(ImportBatch)
    private readonly batchRepo: Repository<ImportBatch>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectDeployment)
    private readonly deploymentRepo: Repository<ProjectDeployment>,
    @InjectRepository(StorageLocation)
    private readonly locationRepo: Repository<StorageLocation>,
    @InjectRepository(StorageAsset)
    private readonly storageAssetRepo: Repository<StorageAsset>,
    @InjectRepository(ImportIssue)
    private readonly issueRepo: Repository<ImportIssue>,
    private readonly notificationsService: NotificationsService,
  ) {}

  previewWorkbook(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Workbook file is required.');
    }

    try {
      return this.workbookParser.parse(file.path);
    } finally {
      this.removeFile(file.path);
    }
  }

  async importWorkbook(
    file: Express.Multer.File,
    activate = false,
    month?: string,
    year?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Workbook file is required.');
    }

    let recordDate: string | null = null;
    if (month && year) {
      const paddedMonth = String(month).padStart(2, '0');
      recordDate = `${year}-${paddedMonth}`;
    }

    const batch = await this.batchRepo.save(
      this.batchRepo.create({
        originalFilename: file.originalname,
        storedFilename: file.filename,
        filePath: file.path,
        status: 'processing',
        isActive: false,
        recordDate,
      }),
    );

    try {
      const parsed = this.workbookParser.parse(file.path);

      if (parsed.issues.some((issue) => issue.severity === 'error')) {
        await this.batchRepo.save({
          id: batch.id,
          status: 'failed',
          preview: parsed.preview,
          summary: parsed.summary,
          errorMessage: 'Workbook parsing failed validation.',
        });

        await this.persistIssues(batch.id, parsed.issues);
        await this.safeNotify({
          category: 'workbook',
          severity: 'critical',
          title: 'Workbook Import Failed',
          message: `${file.originalname} failed validation during upload.`,
          sourceType: 'workbook',
          sourceKey: `workbook-failed:${batch.id}`,
          batch,
          metadata: {
            originalFilename: file.originalname,
            errorCount: parsed.summary.errorCount,
            warningCount: parsed.summary.warningCount,
          },
        });

        throw new BadRequestException({
          message: 'Workbook parsing failed validation.',
          issues: parsed.issues,
        });
      }

      await this.dataSource.transaction(async (manager) => {
        if (activate) {
          await manager
            .getRepository(ImportBatch)
            .createQueryBuilder()
            .update(ImportBatch)
            .set({ isActive: false })
            .execute();
        }

        const projectRepo = manager.getRepository(Project);
        const locationRepo = manager.getRepository(StorageLocation);
        const batchRepo = manager.getRepository(ImportBatch);
        const deploymentRepo = manager.getRepository(ProjectDeployment);
        const storageAssetRepo = manager.getRepository(StorageAsset);
        const issueRepo = manager.getRepository(ImportIssue);

        const batchEntity = await batchRepo.findOneOrFail({
          where: { id: batch.id },
        });

        const projects = new Map<string, Project>();
        const locations = new Map<string, StorageLocation>();

        for (const deployment of parsed.deployments) {
          const existingProject =
            projects.get(deployment.projectNormalizedName) ||
            (await projectRepo.findOne({
              where: { normalizedName: deployment.projectNormalizedName },
            }));

          const project =
            existingProject ||
            (await projectRepo.save(
              projectRepo.create({
                normalizedName: deployment.projectNormalizedName,
                displayName: deployment.projectName,
              }),
            ));

          projects.set(project.normalizedName, project);

          await deploymentRepo.save(
            deploymentRepo.create({
              batch: batchEntity,
              project,
              sourceSheet: deployment.sourceSheet,
              sourceRowNumber: deployment.sourceRowNumber,
              environmentRaw: deployment.environmentRaw,
              environmentType: deployment.environmentType,
              locationCode: deployment.locationCode,
              workloadType: deployment.workloadType,
              vmQuantity: deployment.vmQuantity,
              totalVms: deployment.totalVms,
              core: deployment.core,
              totalCpu: deployment.totalCpu,
              ramGb: deployment.ramGb,
              totalRamGb: deployment.totalRamGb,
              rawValues: deployment.rawValues,
            }),
          );
        }

        for (const asset of parsed.storageAssets) {
          const existingLocation =
            locations.get(asset.locationCode) ||
            (await locationRepo.findOne({
              where: { code: asset.locationCode },
            }));

          const location =
            existingLocation ||
            (await locationRepo.save(
              locationRepo.create({
                code: asset.locationCode,
                displayName: asset.locationCode,
              }),
            ));

          locations.set(location.code, location);

          await storageAssetRepo.save(
            storageAssetRepo.create({
              batch: batchEntity,
              location,
              sourceSheet: asset.sourceSheet,
              sourceRowNumber: asset.sourceRowNumber,
              deviceName: asset.deviceName,
              oem: asset.oem,
              model: asset.model,
              totalCapacityTb: asset.totalCapacityTb,
              usedCapacityTb: asset.usedCapacityTb,
              unusedCapacityTb: asset.unusedCapacityTb,
              allocatedCapacityTb: asset.allocatedCapacityTb,
              remarks: asset.remarks,
              rawValues: asset.rawValues,
            }),
          );
        }

        if (parsed.issues.length) {
          await issueRepo.save(
            parsed.issues.map((issue) =>
              issueRepo.create({
                batch: batchEntity,
                severity: issue.severity,
                scope: issue.scope,
                sourceSheet: issue.sourceSheet ?? null,
                sourceRowNumber: issue.sourceRowNumber ?? null,
                message: issue.message,
                details: issue.details ?? null,
              }),
            ),
          );
        }

        await batchRepo.save({
          id: batch.id,
          status: 'completed',
          isActive: activate,
          preview: parsed.preview,
          summary: parsed.summary,
          errorMessage: null,
        });
      });

      await this.safeNotify({
        category: 'workbook',
        severity: 'success',
        title: activate
          ? 'Workbook Uploaded And Activated'
          : 'Workbook Uploaded',
        message: `${file.originalname} imported ${parsed.summary.deploymentCount} deployment rows and ${parsed.summary.storageAssetCount} storage assets.`,
        sourceType: 'workbook',
        sourceKey: `workbook-uploaded:${batch.id}`,
        batch,
        metadata: {
          originalFilename: file.originalname,
          deploymentCount: parsed.summary.deploymentCount,
          storageAssetCount: parsed.summary.storageAssetCount,
          activated: activate,
        },
      });

      if (activate) {
        await this.notificationsService.syncCapacityAlerts(batch);
      }

      return this.getImportDetail(batch.id);
    } catch (error) {
      if (!(error instanceof BadRequestException)) {
        await this.batchRepo.save({
          id: batch.id,
          status: 'failed',
          errorMessage:
            error instanceof Error ? error.message : 'Workbook import failed.',
        });
        await this.safeNotify({
          category: 'workbook',
          severity: 'critical',
          title: 'Workbook Import Failed',
          message: `${file.originalname} could not be imported.`,
          sourceType: 'workbook',
          sourceKey: `workbook-failed:${batch.id}`,
          batch,
          metadata: {
            originalFilename: file.originalname,
            errorMessage:
              error instanceof Error
                ? error.message
                : 'Workbook import failed.',
          },
        });
      }

      throw error;
    }
  }

  async listImports() {
    const batches = await this.batchRepo.find({
      order: { createdAt: 'DESC' },
    });

    return {
      count: batches.length,
      data: batches.map((batch) => this.serializeBatch(batch)),
    };
  }

  async getImportDetail(id: number) {
    const batch = await this.batchRepo.findOne({ where: { id } });
    if (!batch) {
      throw new NotFoundException('Import batch not found.');
    }

    const issues = await this.issueRepo.find({
      where: { batch: { id } },
      order: { sourceRowNumber: 'ASC', id: 'ASC' },
    });

    return {
      data: this.serializeBatch(batch),
      issues,
    };
  }

  async activateImport(id: number) {
    const batch = await this.batchRepo.findOne({ where: { id } });
    if (!batch) {
      throw new NotFoundException('Import batch not found.');
    }

    await this.batchRepo
      .createQueryBuilder()
      .update(ImportBatch)
      .set({ isActive: false })
      .execute();
    await this.batchRepo.save({ id, isActive: true });

    return {
      message: 'Import snapshot activated successfully.',
    };
  }

  async deleteBatch(id: number) {
    const batch = await this.batchRepo.findOne({ where: { id } });
    if (!batch) {
      throw new NotFoundException('Import batch not found.');
    }

    // Remove physical file if it still exists
    if (batch.filePath) {
      this.removeFile(batch.filePath);
    }

    await this.notificationsService.deleteCapacityAlertsForBatch(id);
    await this.batchRepo.delete({ id });
    await this.safeNotify({
      category: 'workbook',
      severity: 'info',
      title: 'Workbook Deleted',
      message: `${batch.originalFilename} was deleted from import history.`,
      sourceType: 'workbook',
      sourceKey: `workbook-deleted:${id}`,
      metadata: {
        importBatchId: id,
        originalFilename: batch.originalFilename,
      },
    });

    return { message: 'Import batch deleted successfully.', id };
  }

  async getImportStatusSummary() {
    const total = await this.batchRepo.count();
    const completed = await this.batchRepo.count({
      where: { status: 'completed' },
    });
    const processing = await this.batchRepo.count({
      where: { status: 'processing' },
    });
    const failed = await this.batchRepo.count({
      where: { status: 'failed' },
    });
    const active = await this.batchRepo.findOne({
      where: { isActive: true },
    });

    return {
      total,
      completed,
      processing,
      failed,
      activeImportId: active?.id ?? null,
      activeImportName: active?.originalFilename ?? null,
    };
  }

  async getActiveBatch() {
    return this.batchRepo.findOne({
      where: { isActive: true },
    });
  }

  private async persistIssues(
    batchId: number,
    issues: ReturnType<WorkbookImportParser['parse']>['issues'],
  ) {
    const batch = await this.batchRepo.findOne({
      where: { id: batchId },
    });

    if (!batch || !issues.length) {
      return;
    }

    await this.issueRepo.save(
      issues.map((issue) =>
        this.issueRepo.create({
          batch,
          severity: issue.severity,
          scope: issue.scope,
          sourceSheet: issue.sourceSheet ?? null,
          sourceRowNumber: issue.sourceRowNumber ?? null,
          message: issue.message,
          details: issue.details ?? null,
        }),
      ),
    );
  }

  private serializeBatch(batch: ImportBatch) {
    return {
      id: batch.id,
      originalFilename: batch.originalFilename,
      storedFilename: batch.storedFilename,
      status: batch.status,
      isActive: batch.isActive,
      summary: batch.summary,
      preview: batch.preview,
      errorMessage: batch.errorMessage,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
    };
  }

  private removeFile(filePath: string) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  private async safeNotify(
    input: Parameters<NotificationsService['create']>[0],
  ) {
    try {
      await this.notificationsService.create(input);
    } catch {
      // Notification persistence should not block workbook operations.
    }
  }
}
