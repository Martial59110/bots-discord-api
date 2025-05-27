import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Formation } from './formation.entity';

@Entity()
export class ThreadTemplate {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column()
  name: string;

  @Column()
  forumId: string;

  @Column({ default: 0 })
  threadPosition: number;

  @ManyToOne(() => Formation, formation => formation.threads, { onDelete: 'CASCADE' })
  formation: Formation;
} 