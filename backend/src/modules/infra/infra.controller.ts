import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Query,
  Body,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';

import { Role } from '../../common/enums/role.enum';
import { Roles } from '../auth/decorator/roles.decorator';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { InfraAnalyticsService } from './infra-analytics.service';
import { InfraImportsService } from './infra-imports.service';
import { NotificationsService } from './notifications.service';
import { ProjectsService } from './projects.service';
import { StorageService } from './storage.service';

const workbookStorage = diskStorage({
  destination: './uploads',
  filename: (req, file, callback) => {
    const uniqueName =
      Date.now() +
      '-' +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    callback(null, uniqueName);
  },
});

@Controller()
@UseGuards(JwtGuard, RolesGuard)
export class InfraController {
  constructor(
    private readonly importsService: InfraImportsService,
    private readonly projectsService: ProjectsService,
    private readonly storageService: StorageService,
    private readonly analyticsService: InfraAnalyticsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Post('imports/preview')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', { storage: workbookStorage }))
  previewWorkbook(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Workbook file is required.');
    }

    return this.importsService.previewWorkbook(file);
  }

  @Post('imports/workbook')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', { storage: workbookStorage }))
  importWorkbook(
    @UploadedFile() file: Express.Multer.File,
    @Query('activate', new ParseBoolPipe({ optional: true }))
    activate?: boolean,
    @Body('month') month?: string,
    @Body('year') year?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Workbook file is required.');
    }

    return this.importsService.importWorkbook(
      file,
      activate ?? false,
      month,
      year,
    );
  }

  @Get('imports')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VIEWER)
  listImports() {
    return this.importsService.listImports();
  }

  @Get('imports/status')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VIEWER)
  importStatus() {
    return this.importsService.getImportStatusSummary();
  }

  @Get('imports/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VIEWER)
  importDetail(@Param('id', ParseIntPipe) id: number) {
    return this.importsService.getImportDetail(id);
  }

  @Post('imports/:id/activate')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  activateImport(@Param('id', ParseIntPipe) id: number) {
    return this.importsService.activateImport(id);
  }

  @Delete('imports/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  deleteImport(@Param('id', ParseIntPipe) id: number) {
    return this.importsService.deleteBatch(id);
  }

  @Get('projects/summary')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VIEWER)
  projectSummary() {
    return this.projectsService.summary();
  }

  @Get('projects/deployments')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VIEWER)
  projectDeployments(@Query() query: Record<string, string>) {
    return this.projectsService.deployments(query);
  }

  @Get('projects/top-consumers')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VIEWER)
  topConsumers() {
    return this.projectsService.topConsumers();
  }

  @Get('storage/summary')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VIEWER)
  storageSummary() {
    return this.storageService.summary();
  }

  @Get('storage/assets')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VIEWER)
  storageAssets() {
    return this.storageService.assets();
  }

  @Get('infra-analytics/dashboard')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VIEWER)
  infraDashboard() {
    return this.analyticsService.dashboard();
  }

  @Get('infra-analytics/trends/compute')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VIEWER)
  computeTrends() {
    return this.analyticsService.computeTrends();
  }

  @Get('infra-analytics/trends/storage')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VIEWER)
  storageTrends() {
    return this.analyticsService.storageTrends();
  }

  @Get('infra-analytics/alerts')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VIEWER)
  alerts() {
    return this.analyticsService.alerts();
  }

  @Get('notifications')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VIEWER)
  async notifications(@Query('limit') limit?: string) {
    const activeBatch = await this.importsService.getActiveBatch();
    if (activeBatch) {
      await this.notificationsService.syncCapacityAlerts(activeBatch);
    }

    return this.notificationsService.listLatest(Number(limit) || 12);
  }

  @Post('notifications/:id/read')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VIEWER)
  markNotificationRead(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.markRead(id);
  }
}
