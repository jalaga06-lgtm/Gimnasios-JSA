import { Controller, Get } from '@nestjs/common';
import { Public } from './common/auth';
import { PrismaService } from './prisma/prisma.service';

/** Sirve para comprobar que la API y la base de datos responden, y cuántos usuarios hay. */
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    return { status: 'ok', users: await this.prisma.user.count() };
  }
}
