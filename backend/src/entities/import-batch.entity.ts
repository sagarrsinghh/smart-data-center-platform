import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ImportIssue } from './import-issue.entity';
import { ProjectDeployment } from './project-deployment.entity';
import { StorageAsset } from './storage-asset.entity';

@Entity('import_batches')
export class ImportBatch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  originalFilename: string;

  @Column()
  storedFilename: string;

  @Column()
  filePath: string;

  @Column({ default: 'processing' })
  status: string;

  @Column({ default: false })
  isActive: boolean;

  @Column({ type: 'simple-json', nullable: true })
  summary: Record<string, unknown> | null;

  @Column({ type: 'simple-json', nullable: true })
  preview: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'varchar', nullable: true })
  recordDate: string | null;

  @OneToMany(() => ProjectDeployment, (deployment) => deployment.batch)
  deployments: ProjectDeployment[];

  @OneToMany(() => StorageAsset, (asset) => asset.batch)
  storageAssets: StorageAsset[];

  @OneToMany(() => ImportIssue, (issue) => issue.batch)
  issues: ImportIssue[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
