import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { Guild } from '../../guilds/entities/guild.entity';
import { Role } from '../../roles/entities/role.entity';
import { Channel } from '../../channels/entities/channel.entity';
import { ThreadTemplate } from './thread-template.entity';

@Entity()
export class Formation {
  @PrimaryGeneratedColumn('uuid')
  uuidFormation: string;

  @Column()
  name: string;

  @Column()
  uuidGuild: string;

  @Column({ nullable: true })
  uuidRole: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @ManyToOne(() => Category, category => category.formations, { cascade: true, nullable: true })
  category: Category | null;

  @ManyToOne(() => Guild, guild => guild.formations)
  guild: Guild;

  @ManyToMany(() => Role, role => role.formations, { nullable: true })
  @JoinTable()
  roles: Role[];

  @ManyToMany(() => Channel, { cascade: true })
  @JoinTable()
  channels: Channel[];

  @OneToMany(() => ThreadTemplate, thread => thread.formation)
  threads: ThreadTemplate[];
} 