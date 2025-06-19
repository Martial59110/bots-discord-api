import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { EmptyResponseInterceptor } from './common/interceptors/empty-response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import fastifyCsrf from '@fastify/csrf-protection';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyCors from '@fastify/cors';
import { SanitizePipe } from './common/pipes/sanitize.pipe';
import helmet from 'helmet';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';

dotenv.config();
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Guard global d'authentification
  app.useGlobalGuards(new JwtAuthGuard(app.get(JwtService), app.get(Reflector)));


  await app.getHttpAdapter().getInstance().register(fastifyCors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 600 
  });

  // Configuration du rate limiting
  await app.getHttpAdapter().getInstance().register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (req, context) => {
      return {
        code: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded, retry in ${context.after}`,
        date: Date.now(),
        expiresIn: context.after
      }
    }
  });

  // Configuration CSRF
  await app.getHttpAdapter().getInstance().register(fastifyCsrf, {
    sessionPlugin: '@fastify/session',
    cookieOpts: {
      signed: true,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    }
  });

  // Configuration des headers de sécurité
  app.getHttpAdapter().getInstance().addHook('onRequest', (request, reply, done) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    reply.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://discord.com https://cdn.discordapp.com");
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    done();
  });

  app.useGlobalInterceptors(new EmptyResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Configuration pour servir les fichiers statiques
  app.useStaticAssets({
    root: join(__dirname, '..', 'public'),
    prefix: '/public',
    decorateReply: false
  });

  // Sécurité globale
  app.use(helmet());

  const config = new DocumentBuilder()
    .setTitle('Discord Bot API')
    .setDescription('API pour la gestion du bot Discord')
    .setVersion('1.0')
    .addTag('answers', 'Gestion des réponses aux questions')
    .addTag('signature', 'Gestion des signatures des promotions')
    .addBearerAuth(
      { 
        type: 'http', 
        scheme: 'bearer', 
        bearerFormat: 'JWT',
        description: 'Entrez votre JWT token ici'
      },
      'JWT-auth'
    )
    .addTag('bot')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // Supprimer complètement les routes d'authentification et les routes de l'app controller
  if (document.paths) {
    // Supprimer toutes les routes commençant par /auth/
    Object.keys(document.paths).forEach(path => {
      if (path.startsWith('/auth/') || path === '/test-auth' || path === '/auth-callback-page') {
        delete document.paths[path];
      }
    });
  }
  
  SwaggerModule.setup('api', app, document);

  // Nous ne définissons plus de préfixe global pour l'API
  app.setGlobalPrefix('api');
  
  // Configuration de la version de l'API
  await app.listen(3000, '0.0.0.0');
}
bootstrap();