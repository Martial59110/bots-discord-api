import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
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

  @Column()
  formationUuidFormation: string;

  @ManyToOne(() => Formation, formation => formation.threads, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'formationUuidFormation', referencedColumnName: 'uuidFormation' })
  formation: Formation;
} 