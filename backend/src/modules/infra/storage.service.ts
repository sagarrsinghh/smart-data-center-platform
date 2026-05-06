import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { StorageAsset } from '../../entities/storage-asset.entity';
import { InfraImportsService } from './infra-imports.service';

@Injectable()
export class StorageService {
  constructor(
    private readonly importsService: InfraImportsService,
    @InjectRepository(StorageAsset)
    private readonly assetRepo: Repository<StorageAsset>,
  ) {}

  async summary() {
    const batch = await this.requireActiveBatch();
    const assets = await this.assetRepo.find({
      where: { batch: { id: batch.id } },
      relations: ['location'],
      order: { sourceRowNumber: 'ASC' },
    });

    const grouped = new Map<
      string,
      {
        locationCode: string;
        assetCount: number;
        totalCapacityTb: number;
        usedCapacityTb: number;
        unusedCapacityTb: number;
        allocatedCapacityTb: number;
      }
    >();

    assets.forEach((asset) => {
      const current = grouped.get(asset.location.code) || {
        locationCode: asset.location.code,
        assetCount: 0,
        totalCapacityTb: 0,
        usedCapacityTb: 0,
        unusedCapacityTb: 0,
        allocatedCapacityTb: 0,
      };

      current.assetCount += 1;
      current.totalCapacityTb += Number(asset.totalCapacityTb || 0);
      current.usedCapacityTb += Number(asset.usedCapacityTb || 0);
      current.unusedCapacityTb += Number(asset.unusedCapacityTb || 0);
      current.allocatedCapacityTb += Number(asset.allocatedCapacityTb || 0);
      grouped.set(asset.location.code, current);
    });

    return {
      activeImportId: batch.id,
      totalAssets: assets.length,
      totalCapacityTb: Number(
        assets
          .reduce((sum, asset) => sum + Number(asset.totalCapacityTb || 0), 0)
          .toFixed(3),
      ),
      usedCapacityTb: Number(
        assets
          .reduce((sum, asset) => sum + Number(asset.usedCapacityTb || 0), 0)
          .toFixed(3),
      ),
      locations: Array.from(grouped.values()).map((location) => ({
        ...location,
        totalCapacityTb: Number(location.totalCapacityTb.toFixed(3)),
        usedCapacityTb: Number(location.usedCapacityTb.toFixed(3)),
        unusedCapacityTb: Number(location.unusedCapacityTb.toFixed(3)),
        allocatedCapacityTb: Number(location.allocatedCapacityTb.toFixed(3)),
        utilizationPercent:
          location.totalCapacityTb > 0
            ? Number(
                (
                  (location.usedCapacityTb / location.totalCapacityTb) *
                  100
                ).toFixed(2),
              )
            : 0,
      })),
    };
  }

  async assets() {
    const batch = await this.requireActiveBatch();
    const assets = await this.assetRepo.find({
      where: { batch: { id: batch.id } },
      relations: ['location'],
      order: { sourceRowNumber: 'ASC' },
    });

    return {
      count: assets.length,
      data: assets,
    };
  }

  private async requireActiveBatch() {
    const batch = await this.importsService.getActiveBatch();
    if (!batch) {
      throw new NotFoundException('No active workbook snapshot found.');
    }

    return batch;
  }
}
