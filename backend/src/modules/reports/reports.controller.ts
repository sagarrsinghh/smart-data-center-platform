import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';

import { Role } from '../../common/enums/role.enum';
import { Roles } from '../auth/decorator/roles.decorator';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  generate(@Body() body: GenerateReportDto) {
    return this.reportsService.generateReport(body);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VIEWER)
  findAll() {
    return this.reportsService.findAll();
  }

  @Get(':id/download')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VIEWER)
  async download(@Param('id') id: number, @Res() res: Response) {
    const filePath = await this.reportsService.download(id);
    return res.download(filePath);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  remove(@Param('id') id: number) {
    return this.reportsService.remove(id);
  }
}
