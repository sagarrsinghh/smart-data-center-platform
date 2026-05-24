import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ImportBatch } from './import-batch.entity';

@Entity('notifications')
@Index(['sourceKey'], { unique: true })
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  category: string;

  @Column()
  severity: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', nullable: true })
  sourceType: string | null;

  @Column({ type: 'varchar', nullable: true })
  sourceKey: string | null;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown> | null;

  @ManyToOne(() => ImportBatch, { nullable: true, onDelete: 'SET NULL' })
  batch: ImportBatch | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
