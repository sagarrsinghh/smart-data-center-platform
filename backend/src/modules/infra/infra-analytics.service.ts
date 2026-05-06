import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ImportBatch } from '../../entities/import-batch.entity';
import { ImportIssue } from '../../entities/import-issue.entity';
import { ProjectDeployment } from '../../entities/project-deployment.entity';
import { StorageAsset } from '../../entities/storage-asset.entity';
import { InfraImportsService } from './infra-imports.service';

@Injectable()
export class InfraAnalyticsService {
  constructor(
    private readonly importsService: InfraImportsService,
    @InjectRepository(ProjectDeployment)
    private readonly deploymentRepo: Repository<ProjectDeployment>,
    @InjectRepository(StorageAsset)
    private readonly assetRepo: Repository<StorageAsset>,
    @InjectRepository(ImportIssue)
    private readonly issueRepo: Repository<ImportIssue>,
  ) {}

  async dashboard() {
    const batch = await this.requireActiveBatch();
    const [deployments, assets, issues] = await Promise.all([
      this.deploymentRepo.find({
        where: { batch: { id: batch.id } },
        relations: ['project'],
      }),
      this.assetRepo.find({
        where: { batch: { id: batch.id } },
        relations: ['location'],
      }),
      this.issueRepo.find({
        where: { batch: { id: batch.id } },
      }),
    ]);

    const projectTotals = new Map<
      string,
      {
        projectName: string;
        totalCpu: number;
        totalRamGb: number;
        totalVms: number;
      }
    >();
    const locationTotals = new Map<
      string,
      {
        locationCode: string;
        totalCpu: number;
        totalRamGb: number;
        totalVms: number;
      }
    >();
    const environmentTotals = new Map<string, number>();
    const workloadTotals = new Map<string, number>();

    deployments.forEach((deployment) => {
      const project = projectTotals.get(deployment.project.normalizedName) || {
        projectName: deployment.project.displayName,
        totalCpu: 0,
        totalRamGb: 0,
        totalVms: 0,
      };

      project.totalCpu += Number(deployment.totalCpu || 0);
      project.totalRamGb += Number(deployment.totalRamGb || 0);
      project.totalVms += Number(
        deployment.totalVms || deployment.vmQuantity || 0,
      );
      projectTotals.set(deployment.project.normalizedName, project);

      const location = locationTotals.get(deployment.locationCode) || {
        locationCode: deployment.locationCode,
        totalCpu: 0,
        totalRamGb: 0,
        totalVms: 0,
      };

      location.totalCpu += Number(deployment.totalCpu || 0);
      location.totalRamGb += Number(deployment.totalRamGb || 0);
      location.totalVms += Number(
        deployment.totalVms || deployment.vmQuantity || 0,
      );
      locationTotals.set(deployment.locationCode, location);

      environmentTotals.set(
        deployment.environmentType,
        (environmentTotals.get(deployment.environmentType) || 0) +
          Number(deployment.totalCpu || 0),
      );
      workloadTotals.set(
        deployment.workloadType,
        (workloadTotals.get(deployment.workloadType) || 0) +
          Number(deployment.totalCpu || 0),
      );
    });

    const storageByLocation = new Map<
      string,
      { locationCode: string; totalCapacityTb: number; usedCapacityTb: number }
    >();

    assets.forEach((asset) => {
      const current = storageByLocation.get(asset.location.code) || {
        locationCode: asset.location.code,
        totalCapacityTb: 0,
        usedCapacityTb: 0,
      };

      current.totalCapacityTb += Number(asset.totalCapacityTb || 0);
      current.usedCapacityTb += Number(asset.usedCapacityTb || 0);
      storageByLocation.set(asset.location.code, current);
    });

    const topProjects = Array.from(projectTotals.values())
      .map((item) => ({
        ...item,
        totalCpu: Number(item.totalCpu.toFixed(2)),
        totalRamGb: Number(item.totalRamGb.toFixed(2)),
      }))
      .sort((left, right) => right.totalCpu - left.totalCpu)
      .slice(0, 10);

    const capacityWarnings = Array.from(storageByLocation.values())
      .map((item) => ({
        ...item,
        utilizationPercent:
          item.totalCapacityTb > 0
            ? Number(
                ((item.usedCapacityTb / item.totalCapacityTb) * 100).toFixed(2),
              )
            : 0,
      }))
      .filter((item) => item.utilizationPercent >= 80)
      .sort(
        (left, right) => right.utilizationPercent - left.utilizationPercent,
      );

    return {
      activeImportId: batch.id,
      totals: {
        projects: projectTotals.size,
        deployments: deployments.length,
        totalCpu: Number(
          deployments
            .reduce((sum, item) => sum + Number(item.totalCpu || 0), 0)
            .toFixed(2),
        ),
        totalRamGb: Number(
          deployments
            .reduce((sum, item) => sum + Number(item.totalRamGb || 0), 0)
            .toFixed(2),
        ),
        totalVms: deployments.reduce(
          (sum, item) => sum + Number(item.totalVms || item.vmQuantity || 0),
          0,
        ),
        totalStorageTb: Number(
          assets
            .reduce((sum, item) => sum + Number(item.totalCapacityTb || 0), 0)
            .toFixed(3),
        ),
        usedStorageTb: Number(
          assets
            .reduce((sum, item) => sum + Number(item.usedCapacityTb || 0), 0)
            .toFixed(3),
        ),
      },
      topProjects,
      locationDistribution: Array.from(locationTotals.values()).map((item) => ({
        ...item,
        totalCpu: Number(item.totalCpu.toFixed(2)),
        totalRamGb: Number(item.totalRamGb.toFixed(2)),
      })),
      environmentDistribution: Array.from(environmentTotals.entries()).map(
        ([environmentType, totalCpu]) => ({
          environmentType,
          totalCpu: Number(totalCpu.toFixed(2)),
        }),
      ),
      workloadDistribution: Array.from(workloadTotals.entries()).map(
        ([workloadType, totalCpu]) => ({
          workloadType,
          totalCpu: Number(totalCpu.toFixed(2)),
        }),
      ),
      storageUtilization: Array.from(storageByLocation.values()).map(
        (item) => ({
          ...item,
          totalCapacityTb: Number(item.totalCapacityTb.toFixed(3)),
          usedCapacityTb: Number(item.usedCapacityTb.toFixed(3)),
          utilizationPercent:
            item.totalCapacityTb > 0
              ? Number(
                  ((item.usedCapacityTb / item.totalCapacityTb) * 100).toFixed(
                    2,
                  ),
                )
              : 0,
        }),
      ),
      warnings: {
        importWarnings: issues.filter((issue) => issue.severity === 'warning')
          .length,
        importErrors: issues.filter((issue) => issue.severity === 'error')
          .length,
        capacityWarnings,
      },
    };
  }

  private async requireActiveBatch() {
    const batch = await this.importsService.getActiveBatch();
    if (!batch) {
      throw new NotFoundException('No active workbook snapshot found.');
    }

    return batch;
  }

  async computeTrends() {
    const batches = await this.deploymentRepo.manager
      .getRepository(ImportBatch)
      .find({
        where: { status: 'completed' },
        order: { createdAt: 'ASC' },
      });

    const trends: any[] = [];
    for (const batch of batches) {
      const deployments = await this.deploymentRepo.find({
        where: { batch: { id: batch.id } },
      });

      const totalProjectCpu = deployments.reduce(
        (sum, item) => sum + Number(item.totalCpu || 0),
        0,
      );
      const totalProjectRamGb = deployments.reduce(
        (sum, item) => sum + Number(item.totalRamGb || 0),
        0,
      );
      const totalProjectVms = deployments.reduce(
        (sum, item) => sum + Number(item.totalVms || 0),
        0,
      );

      const totalCore = deployments.reduce(
        (sum, item) => sum + Number(item.core || 0),
        0,
      );
      const totalRamGb = deployments.reduce(
        (sum, item) => sum + Number(item.ramGb || 0),
        0,
      );
      const totalVmQuantity = deployments.reduce(
        (sum, item) => sum + Number(item.vmQuantity || 0),
        0,
      );

      trends.push({
        batchId: batch.id,
        month: batch.recordDate || batch.createdAt.toISOString().slice(0, 7), // YYYY-MM
        originalFilename: batch.originalFilename,
        totalProjectCpu: Number(totalProjectCpu.toFixed(2)),
        totalProjectRamGb: Number(totalProjectRamGb.toFixed(2)),
        totalProjectVms,
        totalCore: Number(totalCore.toFixed(2)),
        totalRamGb: Number(totalRamGb.toFixed(2)),
        totalVmQuantity,
      });
    }

    trends.sort((a, b) => a.month.localeCompare(b.month));
    return trends;
  }

  async storageTrends() {
    const batches = await this.assetRepo.manager
      .getRepository(ImportBatch)
      .find({
        where: { status: 'completed' },
        order: { createdAt: 'ASC' },
      });

    const trends: any[] = [];
    for (const batch of batches) {
      const assets = await this.assetRepo.find({
        where: { batch: { id: batch.id } },
      });

      const totalCapacityTb = assets.reduce(
        (sum, item) => sum + Number(item.totalCapacityTb || 0),
        0,
      );
      const usedCapacityTb = assets.reduce(
        (sum, item) => sum + Number(item.usedCapacityTb || 0),
        0,
      );

      trends.push({
        batchId: batch.id,
        month: batch.recordDate || batch.createdAt.toISOString().slice(0, 7), // YYYY-MM
        originalFilename: batch.originalFilename,
        totalCapacityTb: Number(totalCapacityTb.toFixed(2)),
        usedCapacityTb: Number(usedCapacityTb.toFixed(2)),
        utilizationPercent:
          totalCapacityTb > 0
            ? Number(((usedCapacityTb / totalCapacityTb) * 100).toFixed(2))
            : 0,
      });
    }

    trends.sort((a, b) => a.month.localeCompare(b.month));
    return trends;
  }

  async alerts() {
    const batch = await this.requireActiveBatch();

    // High CPU Projects
    const deployments = await this.deploymentRepo.find({
      where: { batch: { id: batch.id } },
      relations: ['project'],
    });

    const projectTotals = new Map<
      string,
      { projectName: string; totalCpu: number; totalRamGb: number }
    >();
    deployments.forEach((deployment) => {
      const project = projectTotals.get(deployment.project.normalizedName) || {
        projectName: deployment.project.displayName,
        totalCpu: 0,
        totalRamGb: 0,
      };
      project.totalCpu += Number(deployment.totalCpu || 0);
      project.totalRamGb += Number(deployment.totalRamGb || 0);
      projectTotals.set(deployment.project.normalizedName, project);
    });

    const highComputeProjects = Array.from(projectTotals.values())
      .filter((p) => p.totalCpu >= 100) // Example threshold: 100 CPUs
      .map((p) => ({
        ...p,
        totalCpu: Number(p.totalCpu.toFixed(2)),
        totalRamGb: Number(p.totalRamGb.toFixed(2)),
      }))
      .sort((a, b) => b.totalCpu - a.totalCpu);

    // High Storage Locations
    const assets = await this.assetRepo.find({
      where: { batch: { id: batch.id } },
      relations: ['location'],
    });

    const storageByLocation = new Map<
      string,
      { locationCode: string; totalCapacityTb: number; usedCapacityTb: number }
    >();
    assets.forEach((asset) => {
      const current = storageByLocation.get(asset.location.code) || {
        locationCode: asset.location.code,
        totalCapacityTb: 0,
        usedCapacityTb: 0,
      };
      current.totalCapacityTb += Number(asset.totalCapacityTb || 0);
      current.usedCapacityTb += Number(asset.usedCapacityTb || 0);
      storageByLocation.set(asset.location.code, current);
    });

    const highStorageLocations = Array.from(storageByLocation.values())
      .map((item) => ({
        ...item,
        utilizationPercent:
          item.totalCapacityTb > 0
            ? Number(
                ((item.usedCapacityTb / item.totalCapacityTb) * 100).toFixed(2),
              )
            : 0,
      }))
      .filter((item) => item.utilizationPercent >= 80)
      .sort((a, b) => b.utilizationPercent - a.utilizationPercent);

    return {
      activeImportId: batch.id,
      highComputeProjects,
      highStorageLocations,
    };
  }
}
