import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ImportBatch } from '../../entities/import-batch.entity';
import { ImportIssue } from '../../entities/import-issue.entity';
import { Notification } from '../../entities/notification.entity';
import { ProjectDeployment } from '../../entities/project-deployment.entity';
import { Project } from '../../entities/project.entity';
import { StorageAsset } from '../../entities/storage-asset.entity';
import { StorageLocation } from '../../entities/storage-location.entity';
import { InfraAnalyticsService } from './infra-analytics.service';
import { InfraController } from './infra.controller';
import { InfraImportsService } from './infra-imports.service';
import { NotificationsService } from './notifications.service';
import { WorkbookImportParser } from './parsers/workbook-import.parser';
import { StorageUtilizationParser } from './parsers/storage-utilization.parser';
import { VmCoreRamParser } from './parsers/vm-core-ram.parser';
import { ProjectsService } from './projects.service';
import { StorageService } from './storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ImportBatch,
      ImportIssue,
      Project,
      ProjectDeployment,
      StorageLocation,
      StorageAsset,
      Notification,
    ]),
  ],
  controllers: [InfraController],
  providers: [
    InfraImportsService,
    ProjectsService,
    StorageService,
    InfraAnalyticsService,
    NotificationsService,
    WorkbookImportParser,
    VmCoreRamParser,
    StorageUtilizationParser,
  ],
  exports: [InfraImportsService],
})
export class InfraModule {}
