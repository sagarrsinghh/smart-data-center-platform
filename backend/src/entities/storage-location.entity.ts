import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { StorageAsset } from './storage-asset.entity';

@Entity('storage_locations')
export class StorageLocation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column()
  displayName: string;

  @OneToMany(() => StorageAsset, (asset) => asset.location)
  assets: StorageAsset[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
