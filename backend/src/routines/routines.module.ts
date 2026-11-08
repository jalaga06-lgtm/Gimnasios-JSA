import { Body, Controller, Delete, ForbiddenException, Get, Injectable, Module, NotFoundException, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser, Roles } from '../common/auth';

class RoutineDto { @IsInt() clientId: number; @IsString() title: string; @IsString() description: string; }
class UpdateRoutineDto { @IsOptional() @IsString() title?: string; @IsOptional() @IsString() description?: string; }

@Injectable()
export class RoutinesService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  forTrainer(id: number) { return this.prisma.routine.findMany({ where: { trainerId: id }, orderBy: { id: 'desc' }, include: { client: { select: { name: true } } } }); }
  forClient(clientId: number) { return this.prisma.routine.findMany({ where: { clientId }, orderBy: { id: 'desc' }, include: { trainer: { select: { name: true } } } }); }

  async create(dto: RoutineDto, t: AuthUser) {
    const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
    if (!client || client.trainerId !== t.id) throw new ForbiddenException('Solo puedes crear rutinas para tus clientes asignados');
    const r = await this.prisma.routine.create({ data: { ...dto, trainerId: t.id } });
    await this.audit.log(t.id, 'CREAR', 'Rutina', `${r.title} para ${client.name}`);
    return r;
  }

  private async own(id: number, t: AuthUser) {
    const r = await this.prisma.routine.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Rutina no encontrada');
    if (r.trainerId !== t.id) throw new ForbiddenException('Esta rutina pertenece a otro entrenador');
    return r;
  }

  async update(id: number, dto: UpdateRoutineDto, t: AuthUser) {
    await this.own(id, t);
    const r = await this.prisma.routine.update({ where: { id }, data: dto });
    await this.audit.log(t.id, 'MODIFICAR', 'Rutina', r.title);
    return r;
  }

  async remove(id: number, t: AuthUser) {
    const r = await this.own(id, t);
    await this.prisma.routine.delete({ where: { id } });
    await this.audit.log(t.id, 'ELIMINAR', 'Rutina', r.title);
    return { ok: true };
  }
}

/** RF06: el entrenador crea, consulta y modifica rutinas; el cliente las consulta. */
@Controller('routines')
export class RoutinesController {
  constructor(private svc: RoutinesService) {}
  @Roles(Role.ENTRENADOR) @Get() list(@CurrentUser() u: AuthUser) { return this.svc.forTrainer(u.id); }
  @Roles(Role.CLIENTE) @Get('me') mine(@CurrentUser() u: AuthUser) { if (!u.clientId) throw new ForbiddenException('Tu usuario no está vinculado a un cliente'); return this.svc.forClient(u.clientId); }
  @Roles(Role.ENTRENADOR) @Post() create(@Body() dto: RoutineDto, @CurrentUser() u: AuthUser) { return this.svc.create(dto, u); }
  @Roles(Role.ENTRENADOR) @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoutineDto, @CurrentUser() u: AuthUser) { return this.svc.update(id, dto, u); }
  @Roles(Role.ENTRENADOR) @Delete(':id') remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.remove(id, u); }
}

@Module({ controllers: [RoutinesController], providers: [RoutinesService] })
export class RoutinesModule {}
