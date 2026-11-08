import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { seedDemo } from './seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // En demostración, crea los usuarios y datos de prueba al arrancar.
  if (process.env.SEED_DEMO === 'true') {
    try {
      await seedDemo(app.get(PrismaService));
      console.log('Datos de demostración listos.');
    } catch (e) {
      console.error('No se pudieron cargar los datos de demostración:', e);
    }
  }
  await app.listen(process.env.PORT || 3000);
  console.log(`API escuchando en el puerto ${process.env.PORT || 3000}`);
}
bootstrap();
