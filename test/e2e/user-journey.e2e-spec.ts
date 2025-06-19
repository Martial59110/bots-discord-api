import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { ConfigModule } from '@nestjs/config';

describe('Chemin utilisateur complet (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let testGuildId: string;
  let testMemberId: string;
  let testPromotionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test'
        }),
        AppModule
      ],
    }).compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    // Authentification
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: process.env.TEST_USERNAME || 'test_user',
        password: process.env.TEST_PASSWORD || 'test_password'
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Création et configuration d\'un serveur', () => {
    it('devrait créer une nouvelle guilde', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/guilds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          uuid: '123456789012345678',
          name: 'Test Guild',
          memberCount: '100',
          configuration: {}
        });

      expect(response.status).toBe(201);
      testGuildId = response.body.uuid;
    });

    it('devrait créer un nouveau membre', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          uuid: '234567890123456789',
          guildUsername: 'Test User',
          uuidGuild: testGuildId,
          uuidDiscordUser: '345678901234567890'
        });

      expect(response.status).toBe(201);
      testMemberId = response.body.uuid;
    });

    it('devrait créer une nouvelle promotion', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/promotions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          uuid: '456789012345678901',
          name: 'Test Promotion',
          uuidGuild: testGuildId,
          uuidManager: testMemberId
        });

      expect(response.status).toBe(201);
      testPromotionId = response.body.uuid;
    });

    it('devrait créer une nouvelle catégorie', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          uuid: '567890123456789012',
          name: 'Test Category',
          position: 1,
          uuidGuild: testGuildId,
          uuidPromotion: testPromotionId
        });

      expect(response.status).toBe(201);
    });

    it('devrait créer un nouveau canal', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/channels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          uuid: '678901234567890123',
          name: 'test-channel',
          type: 'text',
          channelPosition: 1,
          uuidGuild: testGuildId,
          uuidCategory: '567890123456789012'
        });

      expect(response.status).toBe(201);
    });
  });

  describe('Gestion des rôles et permissions', () => {
    it('devrait créer un nouveau rôle', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          uuid: '789012345678901234',
          name: 'Test Role',
          color: '#FF0000',
          uuidGuild: testGuildId
        });

      expect(response.status).toBe(201);
    });

    it('devrait attribuer un rôle à un membre', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/members/${testMemberId}/roles`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          roleUuid: '789012345678901234'
        });

      expect(response.status).toBe(201);
    });
  });

  describe('Gestion des signatures', () => {
    it('devrait créer une signature pour une promotion', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/signature/${testPromotionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          uuidMember: testMemberId,
          status: 'signed'
        });

      expect(response.status).toBe(201);
    });

    it('devrait récupérer les signatures d\'une promotion', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/signature/${testPromotionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Nettoyage', () => {
    it('devrait supprimer le canal', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/channels/678901234567890123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('devrait supprimer la catégorie', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/categories/567890123456789012')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('devrait supprimer la promotion', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/promotions/${testPromotionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('devrait supprimer le membre', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/members/${testMemberId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('devrait supprimer la guilde', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/guilds/${testGuildId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });
}); 