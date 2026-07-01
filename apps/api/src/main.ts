import 'reflect-metadata';
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { getCorsOrigin } from './modules/auth/constants/auth.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

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

  await app.listen(process.env.PORT ?? 3002);
}
void bootstrap();
