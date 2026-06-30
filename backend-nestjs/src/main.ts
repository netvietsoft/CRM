import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const configuredOrigins = [process.env.CORS, process.env.FRONTEND_URL]
    .flatMap((value) => (value ? value.split(',') : []))
    .map((origin) => origin.trim())
    .filter(Boolean);

  const allowedOrigins = new Set(
    configuredOrigins.length > 0
      ? configuredOrigins
      : [
          'http://localhost:3900',
          'http://localhost:3002',
          'http://127.0.0.1:3900',
          'http://127.0.0.1:3002',
        ],
  );

  app.enableCors({
    origin: (origin, callback) => {
      const isLocalDevOrigin =
        !!origin &&
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) &&
        process.env.NODE_ENV !== 'production';

      if (!origin || allowedOrigins.has(origin) || isLocalDevOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('CRM API')
    .setDescription('CRM Backend API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('crm_access_token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3901;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
}
void bootstrap();
