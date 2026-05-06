import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { AuditLog } from '../../entities';

@Injectable()
export class AuditLogService {
  async createAuditLogWithQueryRunner(
    queryRunner: QueryRunner,
    user: any,
    log: any,
  ) {
    await queryRunner.manager
      .createQueryBuilder()
      .insert()
      .into(AuditLog)
      .values({
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        clientId: log.clientId,
        oldValue: log.oldValue ?? null,
        newValue: log.newValue ?? null,
        userId: user?.id ?? null,
      })
      .execute();
  }
}
