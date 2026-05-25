// src/main.ts — NestJS hardening completo (Sprint 1)
// Aplicar en CADA microservicio NestJS
// Instalar dependencias: npm install helmet @nestjs/throttler

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Deshabilitar logs detallados en producción
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn']
      : ['log', 'debug', 'error', 'verbose', 'warn'],
  });

  // ──────────────────────────────────────────
  // 1. HELMET — headers de seguridad
  // ──────────────────────────────────────────
  // Elimina X-Powered-By, agrega CSP, HSTS, X-Frame-Options, etc.
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // quitar unsafe-inline si usas CSS-in-JS
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      // HTTP Strict Transport Security (HSTS)
      hsts: {
        maxAge: 31536000, // 1 año en segundos
        includeSubDomains: true,
        preload: true,
      },
      // Prevenir clickjacking
      frameguard: { action: 'deny' },
      // Prevenir MIME sniffing
      noSniff: true,
      // Eliminar X-Powered-By: Express
      hidePoweredBy: true,
      // Referrer Policy
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      // Cross-Origin Resource Policy
      crossOriginResourcePolicy: { policy: 'same-origin' },
      // Cross-Origin Embedder Policy
      crossOriginEmbedderPolicy: false, // desactivar si usas recursos externos (CDN, fuentes)
    }),
  );

  // ──────────────────────────────────────────
  // 2. CORS — solo dominios autorizados
  // ──────────────────────────────────────────
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? allowedOrigins  // en producción: solo dominios de la lista
      : true,           // en desarrollo: todos los orígenes
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: true,
    maxAge: 86400, // 24h — cache de preflight
  });

  // ──────────────────────────────────────────
  // 3. VALIDATION PIPE — validar todos los DTOs
  // ──────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,             // elimina propiedades no declaradas en el DTO
      forbidNonWhitelisted: true,  // lanza error si hay propiedades extra
      transform: true,             // transforma tipos automáticamente
      disableErrorMessages: process.env.NODE_ENV === 'production', // ocultar detalles en prod
    }),
  );

  // ──────────────────────────────────────────
  // 4. SWAGGER — solo en no-producción
  // ──────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    // Importación dinámica para evitar que esté disponible en prod
    const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
    const config = new DocumentBuilder()
      .setTitle('API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
    console.log('📖 Swagger disponible en /api-docs (solo en desarrollo)');
  }

  // ──────────────────────────────────────────
  // 5. GRACEFUL SHUTDOWN
  // ──────────────────────────────────────────
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 Servicio corriendo en puerto ${port}`);
  console.log(`🛡️  Helmet: activo | CORS: ${process.env.NODE_ENV === 'production' ? 'restringido' : 'abierto (dev)'}`);
}

bootstrap();
