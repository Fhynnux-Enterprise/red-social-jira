import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SystemConfig } from './src/ads/entities/system-config.entity';
import { Repository } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const repo = app.get<Repository<SystemConfig>>(getRepositoryToken(SystemConfig));
  
  const configs = await repo.find();
  console.log('--- ACTUAL CONFIGURATIONS ---');
  console.log(JSON.stringify(configs, null, 2));
  console.log('-----------------------------');
  
  await app.close();
}
bootstrap();
