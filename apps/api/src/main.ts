import 'reflect-metadata';
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { getCorsOrigin } from './modules/auth/constants/auth.constants';
import type { Request, Response, NextFunction } from 'express';
import { realdataAllowsRequest } from './common/safety/realdata-safety';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(cookieParser());

  if (process.env.VALORAR_DATABASE_ENV === 'realdata') {
    app.use((request: Request, response: Response, next: NextFunction) => {
      if (!realdataAllowsRequest(request.method, request.path)) {
        response
          .status(403)
          .json({ message: 'RealData es un entorno visual de sólo lectura.' });
        return;
      }
      next();
    });
  }

  app.enableCors({
    origin: getCorsOrigin(),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new PrismaExceptionFilter());

  if (process.env.SWAGGER_ENABLED !== 'false') {
    try {
      const swaggerConfig = new DocumentBuilder()
        .setTitle('Valorar Platform API')
        .setDescription('Real estate SaaS platform API')
        .setVersion('1.0')
        .addTag('Auth')
        .addTag('Properties')
        .addTag('Property Listings')
        .addTag('Property Prices')
        .addTag('Property Images')
        .addTag('Property Features')
        .addTag('Property Feature Assignments')
        .addTag('Public Properties')
        .addTag('Geo')
        .build();

      const document = SwaggerModule.createDocument(app, swaggerConfig);
      SwaggerModule.setup('api/docs', app, document);
    } catch (error) {
      console.warn('Swagger setup skipped:', error);
    }
  }

  if (process.env.VALORAR_DATABASE_ENV === 'realdata') {
    await app.listen(3202, '127.0.0.1');
  } else {
    await app.listen(process.env.PORT ?? 3002);
  }
}
void bootstrap();
