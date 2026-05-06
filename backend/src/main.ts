import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common';
import { ResponseTransformInterceptor } from './common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable CORS
  app.enableCors();

  // Global validation pipe – strips unknown fields, transforms types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter – structured JSON error responses
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global response transform interceptor – wraps every response
  app.useGlobalInterceptors(new ResponseTransformInterceptor());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(
    `🚀 Smart Data Center API running on: http://localhost:${port}/api`,
  );
}
void bootstrap();
