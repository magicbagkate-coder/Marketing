import { NestFactory } from '@nestjs/core';

import { AppModule } from '@/app.module';
import { envConfig } from '@/config/env.config';

async function startApp(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  await app.listen(envConfig.port);
}

void startApp();
