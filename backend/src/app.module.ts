import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Database
import { DatabaseModule } from './database/database.module';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { InfraModule } from './modules/infra/infra.module';

// Common Services
import { ApiResponseService } from './common/api-response.service';

@Module({
  imports: [
    // Global config
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ScheduleModule.forRoot(),

    // Database connection
    DatabaseModule,

    // Feature modules
    AuthModule,
    UsersModule,
    ReportsModule,
    AuditLogModule,
    InfraModule,
  ],
  controllers: [AppController],
  providers: [AppService, ApiResponseService],
  exports: [ApiResponseService],
})
export class AppModule {}
