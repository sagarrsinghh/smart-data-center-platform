import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ImportBatch } from './import-batch.entity';

@Entity('import_issues')
export class ImportIssue {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ImportBatch, (batch) => batch.issues, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  batch: ImportBatch;

  @Column()
  severity: string;

  @Column()
  scope: string;

  @Column({ type: 'varchar', nullable: true })
  sourceSheet: string | null;

  @Column({ type: 'int', nullable: true })
  sourceRowNumber: number | null;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'simple-json', nullable: true })
  details: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
