import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ImportBatch } from './import-batch.entity';
import { Project } from './project.entity';

@Entity('project_deployments')
@Index(['batch', 'sourceRowNumber'], { unique: true })
export class ProjectDeployment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Project, (project) => project.deployments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  project: Project;

  @ManyToOne(() => ImportBatch, (batch) => batch.deployments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  batch: ImportBatch;

  @Column()
  sourceSheet: string;

  @Column()
  sourceRowNumber: number;

  @Column()
  environmentRaw: string;

  @Column()
  environmentType: string;

  @Column()
  locationCode: string;

  @Column()
  workloadType: string;

  @Column({ type: 'int', nullable: true })
  vmQuantity: number | null;

  @Column({ type: 'int', nullable: true })
  totalVms: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  core: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  totalCpu: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  ramGb: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  totalRamGb: number | null;

  @Column({ type: 'simple-json', nullable: true })
  rawValues: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
