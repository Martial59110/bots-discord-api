/* 
 * Entité Campus - Représente un campus Simplon dans la base de données
 * 
 * Chaque campus Simplon (Lille, Valenciennes, etc.) est stocké ici avec ses infos de base
 * et ses relations avec Discord (serveur + rôle) et les promotions
 * 
 * Quand on crée un campus, on doit obligatoirement lui associer :
 * - Un serveur Discord (uuidGuild)
 * - Un rôle Discord (uuidRole) qui sera créé automatiquement
 */
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Guild } from '../../guilds/entities/guild.entity';
import { Role } from 'src/roles/entities/role.entity';
import { Promotion } from 'src/promotions/entities/promotion.entity';


@Entity('Campuses')
export class Campus {
  /* Identifiant unique du campus, généré automatiquement */
  @ApiProperty({
    description: 'UUID unique du campus',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @PrimaryGeneratedColumn('uuid', { name: 'uuid_campus' })
  uuidCampus: string;

  /* Nom du campus (ex: "Simplon Paris", "Simplon Lyon") */
  @ApiProperty({
    description: 'Nom du campus',
    example: 'Simplon Paris',
    maxLength: 50
  })
  @Column({ type: 'varchar', length: 50 })
  name: string;

  /* ID du serveur Discord où se trouve ce campus */
  @ApiProperty({
    description: 'UUID Discord du serveur associé',
    example: '123456789012345678'
  })
  @Column({ name: 'uuid_guild', type: 'varchar', length: 19 })
  uuidGuild: string;

  /* Timestamps automatiques pour le suivi */
  @ApiProperty({
    description: 'Date de création'
  })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @ApiProperty({
    description: 'Date de dernière mise à jour'
  })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  /* Relation avec le serveur Discord - Un campus appartient à un serveur */
  @ApiProperty({
    description: 'Le serveur Discord associé au campus',
    type: () => Guild
  })
  @ManyToOne(() => Guild, guild => guild.campuses)
  @JoinColumn({ name: 'uuid_guild' })
  guild: Guild;

  /* ID du rôle Discord créé automatiquement pour ce campus */
  @Column({ type: 'varchar', name: 'uuid_role' })
  uuidRole: string;

  /* Relation avec le rôle Discord - Un campus a un seul rôle */
  @OneToOne(() => Role, role => role.campus)
  @JoinColumn({ name: 'uuid_role' })
  role: Role

  /* Les promotions qui se déroulent dans ce campus */
  @ApiProperty({
    description: 'Promotions associées à ce campus',
    type: () => [Promotion]
  })
  @OneToMany(() => Promotion, promotion => promotion.campus)
  promotions: Promotion[];
}
