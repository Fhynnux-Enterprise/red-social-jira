import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Activar validaciones globales para todos los DTOs (class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // Elimina campos que no están en el DTO
      forbidNonWhitelisted: true, // Devuelve error si llegan campos no permitidos
      transform: true,       // Convierte tipos automáticamente (ej. string -> number)
    }),
  );

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();

