import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { MembershipsModule } from './memberships/memberships.module';
import { AccessModule } from './access/access.module';
import { TrainersModule } from './trainers/trainers.module';
import { RoutinesModule } from './routines/routines.module';
import { ClassesModule } from './classes/classes.module';
import { BookingsModule } from './bookings/bookings.module';
import { ReportsModule } from './reports/reports.module';
import { AuthGuard } from './common/auth';
import { HealthController } from './health.controller';

// Monolito modular: un módulo por dominio funcional del documento.
@Module({
  imports: [PrismaModule, AuditModule, AuthModule, UsersModule, ClientsModule, MembershipsModule, AccessModule, TrainersModule, RoutinesModule, ClassesModule, BookingsModule, ReportsModule],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
