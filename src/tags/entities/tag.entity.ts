import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('tags')
export class Tag {
  @ApiProperty({ description: 'Identifiant unique du tag' })
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @ApiProperty({ description: 'Nom du tag' })
  @Column({ unique: true })
  name: string;

  @ApiProperty({ description: 'Description du tag' })
  @Column({ nullable: true })
  description: string;

  @ApiProperty({ description: 'Date de création du tag' })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @ApiProperty({ description: 'Date de dernière modification du tag' })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
