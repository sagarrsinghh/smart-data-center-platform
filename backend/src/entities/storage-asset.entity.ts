import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ImportBatch } from './import-batch.entity';
import { StorageLocation } from './storage-location.entity';

@Entity('storage_assets')
@Index(['batch', 'sourceRowNumber'], { unique: true })
export class StorageAsset {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StorageLocation, (location) => location.assets, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  location: StorageLocation;

  @ManyToOne(() => ImportBatch, (batch) => batch.storageAssets, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  batch: ImportBatch;

  @Column()
  sourceSheet: string;

  @Column()
  sourceRowNumber: number;

  @Column()
  deviceName: string;

  @Column({ type: 'varchar', nullable: true })
  oem: string | null;

  @Column({ type: 'varchar', nullable: true })
  model: string | null;

  @Column({ type: 'decimal', precision: 14, scale: 3, nullable: true })
  totalCapacityTb: number | null;

  @Column({ type: 'decimal', precision: 14, scale: 3, nullable: true })
  usedCapacityTb: number | null;

  @Column({ type: 'decimal', precision: 14, scale: 3, nullable: true })
  unusedCapacityTb: number | null;

  @Column({ type: 'decimal', precision: 14, scale: 3, nullable: true })
  allocatedCapacityTb: number | null;

  @Column({ type: 'varchar', nullable: true })
  remarks: string | null;

  @Column({ type: 'simple-json', nullable: true })
  rawValues: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
