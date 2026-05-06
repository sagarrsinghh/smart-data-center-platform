import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Report } from '../../entities/report.entity';
import { ProjectDeployment } from '../../entities/project-deployment.entity';
import { StorageAsset } from '../../entities/storage-asset.entity';
import { ImportBatch } from '../../entities/import-batch.entity';

import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Report,
      ProjectDeployment,
      StorageAsset,
      ImportBatch,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
