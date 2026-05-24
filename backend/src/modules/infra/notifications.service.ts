import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ImportBatch } from '../../entities/import-batch.entity';
import { Notification } from '../../entities/notification.entity';
import { ProjectDeployment } from '../../entities/project-deployment.entity';
import { StorageAsset } from '../../entities/storage-asset.entity';

interface NotificationInput {
  category: string;
  severity: string;
  title: string;
  message: string;
  sourceType?: string;
  sourceKey?: string;
  batch?: ImportBatch | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class NotificationsService {
  private readonly thresholds = {
    projectCpu: Number(process.env.NOTIFY_PROJECT_CPU_THRESHOLD || 1000),
    projectRamGb: Number(process.env.NOTIFY_PROJECT_RAM_GB_THRESHOLD || 4096),
    projectVms: Number(process.env.NOTIFY_PROJECT_VM_THRESHOLD || 150),
    storagePercent: Number(process.env.NOTIFY_STORAGE_PERCENT_THRESHOLD || 80),
  };

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(ProjectDeployment)
    private readonly deploymentRepo: Repository<ProjectDeployment>,
    @InjectRepository(StorageAsset)
    private readonly assetRepo: Repository<StorageAsset>,
  ) {}

  async create(input: NotificationInput) {
    if (input.sourceKey) {
      const existing = await this.notificationRepo.findOne({
        where: { sourceKey: input.sourceKey },
      });

      if (existing) {
        return this.notificationRepo.save({
          ...existing,
          ...input,
          sourceType: input.sourceType ?? existing.sourceType,
          metadata: input.metadata ?? existing.metadata,
          batch: input.batch ?? existing.batch,
        });
      }
    }

    return this.notificationRepo.save(
      this.notificationRepo.create({
        category: input.category,
        severity: input.severity,
        title: input.title,
        message: input.message,
        sourceType: input.sourceType ?? null,
        sourceKey: input.sourceKey ?? null,
        metadata: input.metadata ?? null,
        batch: input.batch ?? null,
      }),
    );
  }

  async listLatest(limit = 12) {
    const take = Math.min(Math.max(Number(limit) || 12, 1), 50);
    const [items, unreadCount] = await Promise.all([
      this.notificationRepo.find({
        order: { createdAt: 'DESC' },
        take,
      }),
      this.notificationRepo.count({ where: { isRead: false } }),
    ]);

    return {
      count: items.length,
      unreadCount,
      data: items,
    };
  }

  async markRead(id: number) {
    await this.notificationRepo.update({ id }, { isRead: true });
    return { id, isRead: true };
  }

  async deleteCapacityAlertsForBatch(batchId: number) {
    const result = await this.notificationRepo
      .createQueryBuilder()
      .delete()
      .where('category = :category', { category: 'capacity' })
      .andWhere('batchId = :batchId', { batchId })
      .execute();

    return { deleted: result.affected || 0 };
  }

  async syncCapacityAlerts(batch: ImportBatch) {
    const [deployments, assets] = await Promise.all([
      this.deploymentRepo.find({
        where: { batch: { id: batch.id } },
        relations: ['project'],
      }),
      this.assetRepo.find({
        where: { batch: { id: batch.id } },
        relations: ['location'],
      }),
    ]);

    const capacityAlerts = [
      ...this.buildProjectAlerts(batch, deployments),
      ...this.buildStorageAlerts(batch, assets),
    ];
    const sourceKeys = capacityAlerts
      .map((alert) => alert.sourceKey)
      .filter((sourceKey): sourceKey is string => Boolean(sourceKey));

    if (!sourceKeys.length) {
      await this.notificationRepo
        .createQueryBuilder()
        .delete()
        .where('category = :category', { category: 'capacity' })
        .andWhere('batchId = :batchId', { batchId: batch.id })
        .execute();
      return { created: 0 };
    }

    const existingAlerts = await this.notificationRepo.find({
      where: { category: 'capacity', batch: { id: batch.id } },
    });
    const existingBySourceKey = new Map(
      existingAlerts
        .filter((alert) => alert.sourceKey)
        .map((alert) => [alert.sourceKey, alert]),
    );

    await this.notificationRepo.save(
      capacityAlerts.map((alert) => {
        const existing = alert.sourceKey
          ? existingBySourceKey.get(alert.sourceKey)
          : null;

        return this.notificationRepo.create({
          ...existing,
          ...alert,
          isRead: existing?.isRead ?? false,
        });
      }),
    );

    await this.notificationRepo
      .createQueryBuilder()
      .delete()
      .where('category = :category', { category: 'capacity' })
      .andWhere('batchId = :batchId', { batchId: batch.id })
      .andWhere('sourceKey NOT IN (:...sourceKeys)', { sourceKeys })
      .execute();

    return { created: capacityAlerts.length };
  }

  private buildProjectAlerts(
    batch: ImportBatch,
    deployments: ProjectDeployment[],
  ): NotificationInput[] {
    const projects = new Map<
      string,
      {
        projectName: string;
        totalCpu: number;
        totalRamGb: number;
        totalVms: number;
      }
    >();

    deployments.forEach((deployment) => {
      const current = projects.get(deployment.project.normalizedName) || {
        projectName: deployment.project.displayName,
        totalCpu: 0,
        totalRamGb: 0,
        totalVms: 0,
      };

      current.totalCpu += Number(deployment.totalCpu || deployment.core || 0);
      current.totalRamGb += Number(deployment.totalRamGb || 0);
      current.totalVms += Number(
        deployment.totalVms || deployment.vmQuantity || 0,
      );
      projects.set(deployment.project.normalizedName, current);
    });

    const alerts: NotificationInput[] = [];

    projects.forEach((project, normalizedName) => {
      if (project.totalCpu >= this.thresholds.projectCpu) {
        alerts.push(
          this.capacityAlert({
            batch,
            sourceKey: `capacity:${batch.id}:project-cpu:${normalizedName}`,
            title: 'High CPU Usage',
            message: `${project.projectName} is using ${project.totalCpu.toFixed(0)} CPU against the ${this.thresholds.projectCpu} threshold.`,
            metadata: {
              projectName: project.projectName,
              metric: 'cpu',
              value: Number(project.totalCpu.toFixed(2)),
              threshold: this.thresholds.projectCpu,
            },
          }),
        );
      }

      if (project.totalRamGb >= this.thresholds.projectRamGb) {
        alerts.push(
          this.capacityAlert({
            batch,
            sourceKey: `capacity:${batch.id}:project-ram:${normalizedName}`,
            title: 'High RAM Usage',
            message: `${project.projectName} is using ${project.totalRamGb.toFixed(0)} GB RAM against the ${this.thresholds.projectRamGb} GB threshold.`,
            metadata: {
              projectName: project.projectName,
              metric: 'ram',
              value: Number(project.totalRamGb.toFixed(2)),
              threshold: this.thresholds.projectRamGb,
            },
          }),
        );
      }

      if (project.totalVms >= this.thresholds.projectVms) {
        alerts.push(
          this.capacityAlert({
            batch,
            sourceKey: `capacity:${batch.id}:project-vms:${normalizedName}`,
            title: 'High VM Count',
            message: `${project.projectName} has ${project.totalVms} VMs against the ${this.thresholds.projectVms} threshold.`,
            metadata: {
              projectName: project.projectName,
              metric: 'vms',
              value: project.totalVms,
              threshold: this.thresholds.projectVms,
            },
          }),
        );
      }
    });

    return alerts;
  }

  private buildStorageAlerts(
    batch: ImportBatch,
    assets: StorageAsset[],
  ): NotificationInput[] {
    const locations = new Map<
      string,
      { totalCapacityTb: number; usedCapacityTb: number }
    >();

    assets.forEach((asset) => {
      const code = asset.location.code;
      const current = locations.get(code) || {
        totalCapacityTb: 0,
        usedCapacityTb: 0,
      };

      current.totalCapacityTb += Number(asset.totalCapacityTb || 0);
      current.usedCapacityTb += Number(asset.usedCapacityTb || 0);
      locations.set(code, current);
    });

    const alerts: NotificationInput[] = [];
    locations.forEach((location, locationCode) => {
      const utilizationPercent =
        location.totalCapacityTb > 0
          ? (location.usedCapacityTb / location.totalCapacityTb) * 100
          : 0;

      if (utilizationPercent < this.thresholds.storagePercent) {
        return;
      }

      alerts.push(
        this.capacityAlert({
          batch,
          sourceKey: `capacity:${batch.id}:storage:${locationCode}`,
          title: 'High Storage Usage',
          message: `${locationCode} storage is ${utilizationPercent.toFixed(1)}% used against the ${this.thresholds.storagePercent}% threshold.`,
          metadata: {
            locationCode,
            metric: 'storage',
            value: Number(utilizationPercent.toFixed(2)),
            threshold: this.thresholds.storagePercent,
          },
        }),
      );
    });

    return alerts;
  }

  private capacityAlert(input: {
    batch: ImportBatch;
    sourceKey: string;
    title: string;
    message: string;
    metadata: Record<string, unknown>;
  }): NotificationInput {
    return {
      category: 'capacity',
      severity: 'warning',
      sourceType: 'threshold',
      batch: input.batch,
      sourceKey: input.sourceKey,
      title: input.title,
      message: input.message,
      metadata: input.metadata,
    };
  }
}
