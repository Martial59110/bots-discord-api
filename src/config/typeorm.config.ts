import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

// Charge les variables d'environnement de .env.development
dotenv.config({ path: '.env.development' });

export const typeOrmModuleOptions: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [__dirname + '/../**/*.entity.{js,ts}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  autoLoadEntities: false, // Désactivé car nous spécifions les entités manuellement
  synchronize: false, // JAMAIS true en production
  logging: true,
};

// Configuration pour la CLI TypeORM
export const AppDataSource = new DataSource(typeOrmModuleOptions as DataSourceOptions);