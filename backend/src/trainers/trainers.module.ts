import { BadRequestException, Body, Controller, Get, Injectable, Module, Patch } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsInt } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser, Roles } from '../common/auth';
import { effectiveStatus } from '../common/membership.util';

class AssignDto { @IsInt() clientId: number; @IsInt() trainerId: number; }

@Injectable()
export class TrainersService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  trainers() {
    return this.prisma.user.findMany({ where: { role: 'ENTRENADOR', active: true }, select: { id: true, name: true, email: true, trainees: { select: { id: true, name: true } } } });
  }

  async myClients(trainerId: number) {
    const clients = await this.prisma.client.findMany({ where: { trainerId }, include: { memberships: { orderBy: { endDate: 'desc' } } } });
    return clients.map(({ memberships, ...c }) => {
      const m = memberships.find((x) => effectiveStatus(x) === 'ACTIVA') ?? memberships[0];
      return { ...c, membershipStatus: m ? effectiveStatus(m) : 'SIN_MEMBRESIA' };
    });
  }

  async assign(dto: AssignDto, actor: AuthUser) {
    const trainer = await this.prisma.user.findUnique({ where: { id: dto.trainerId } });
    if (!trainer || trainer.role !== 'ENTRENADOR') throw new BadRequestException('El usuario indicado no es un entrenador');
    const client = await this.prisma.client.update({ where: { id: dto.clientId }, data: { trainerId: dto.trainerId } });
    await this.audit.log(actor.id, 'ASIGNAR', 'Entrenador', `${client.name} con ${trainer.name}`);
    return client;
  }
}

@Controller('trainers')
export class TrainersController {
  constructor(private svc: TrainersService) {}
  @Roles(Role.ADMIN) @Get() list() { return this.svc.trainers(); }
  @Roles(Role.ADMIN) @Patch('assign') assign(@Body() dto: AssignDto, @CurrentUser() u: AuthUser) { return this.svc.assign(dto, u); }
  @Roles(Role.ENTRENADOR) @Get('my-clients') mine(@CurrentUser() u: AuthUser) { return this.svc.myClients(u.id); }
}

@Module({ controllers: [TrainersController], providers: [TrainersService] })
export class TrainersModule {}
