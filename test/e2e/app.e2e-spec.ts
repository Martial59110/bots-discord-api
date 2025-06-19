import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { ConfigModule } from '@nestjs/config';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

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

    // Authentification pour obtenir le token
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

  describe('Guilds', () => {
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
      expect(response.body).toHaveProperty('uuid');
      expect(response.body.name).toBe('Test Guild');
    });

    it('devrait récupérer toutes les guildes', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/guilds')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Channels', () => {
    let testGuildId: string;
    let testCategoryId: string;

    beforeAll(async () => {
      // Créer une guilde de test
      const guildResponse = await request(app.getHttpServer())
        .post('/api/guilds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          uuid: '123456789012345678',
          name: 'Test Guild',
          memberCount: '100',
          configuration: {}
        });

      testGuildId = guildResponse.body.uuid;

      // Créer une catégorie de test
      const categoryResponse = await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          uuid: '234567890123456789',
          name: 'Test Category',
          position: 1,
          uuidGuild: testGuildId
        });

      testCategoryId = categoryResponse.body.uuid;
    });

    it('devrait créer un nouveau channel', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/channels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          uuid: '345678901234567890',
          name: 'test-channel',
          type: 'text',
          channelPosition: 1,
          uuidCategory: testCategoryId,
          uuidGuild: testGuildId
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('uuid');
      expect(response.body.name).toBe('test-channel');
    });

    it('devrait récupérer tous les channels', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/channels')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('devrait récupérer un channel par son uuid', async () => {
      const channelResponse = await request(app.getHttpServer())
        .post('/api/channels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          uuid: '456789012345678901',
          name: 'test-channel-2',
          type: 'text',
          channelPosition: 2,
          uuidCategory: testCategoryId,
          uuidGuild: testGuildId
        });

      const response = await request(app.getHttpServer())
        .get(`/api/channels/${channelResponse.body.uuid}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.uuid).toBe(channelResponse.body.uuid);
    });

    it('devrait mettre à jour un channel', async () => {
      const channelResponse = await request(app.getHttpServer())
        .post('/api/channels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          uuid: '567890123456789012',
          name: 'test-channel-3',
          type: 'text',
          channelPosition: 3,
          uuidCategory: testCategoryId,
          uuidGuild: testGuildId
        });

      const response = await request(app.getHttpServer())
        .patch(`/api/channels/${channelResponse.body.uuid}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'updated-channel',
          type: 'voice',
          channelPosition: 4
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('updated-channel');
      expect(response.body.type).toBe('voice');
      expect(response.body.channelPosition).toBe(4);
    });

    it('devrait supprimer un channel', async () => {
      const channelResponse = await request(app.getHttpServer())
        .post('/api/channels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          uuid: '678901234567890123',
          name: 'test-channel-4',
          type: 'text',
          channelPosition: 5,
          uuidCategory: testCategoryId,
          uuidGuild: testGuildId
        });

      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/channels/${channelResponse.body.uuid}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);

      const getResponse = await request(app.getHttpServer())
        .get(`/api/channels/${channelResponse.body.uuid}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });
}); 