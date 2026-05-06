import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('uploaded_files')
export class Upload {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  filename: string;

  @Column({ nullable: true })
  original_filename: string;

  @Column()
  filepath: string;

  @Column()
  mimetype: string;

  @Column()
  size: number;

  @Column({
    type: 'enum',
    enum: ['excel', 'ppt'],
  })
  file_type: string;

  @Column({
    default: 'processing',
  })
  status: string;

  @Column({ default: 0 })
  records_extracted: number;

  @Column({ type: 'int', default: 0 })
  total_rows: number;

  @Column({ type: 'int', default: 0 })
  header_row: number;

  @Column({ type: 'simple-json', nullable: true })
  column_mapping: Record<string, string> | null;

  @Column({ nullable: true })
  error_message: string;

  @CreateDateColumn()
  created_at: Date;
}
