import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const frontendOrigins = configService
    .get<string>('FRONTEND_URL', 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // ─── Seguridad ────────────────────────────────────────────────
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: frontendOrigins.length === 1 ? frontendOrigins[0] : frontendOrigins,
    credentials: true,
  });

  // ─── Versioning ───────────────────────────────────────────────
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.setGlobalPrefix('api');

  // ─── Validación global ────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Swagger / OpenAPI ────────────────────────────────────────
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ERP Pinturería API')
      .setDescription('API REST para el ERP de Pinturería')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }
  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);
  logger.log(`API corriendo en: http://localhost:${port}/api/v1`);
  if (configService.get('NODE_ENV') !== 'production') {
    logger.log(`Swagger: http://localhost:${port}/docs`);
  }
}

bootstrap();

