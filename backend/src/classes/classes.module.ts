import { Body, Controller, Delete, ForbiddenException, Get, Injectable, Module, NotFoundException, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser, Roles } from '../common/auth';

class ClassDto {
  @IsString() name: string;
  @IsString() weekday: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'La hora debe tener formato HH:MM' }) startTime: string;
  @IsInt() @Min(1) capacity: number;
  @IsOptional() @IsInt() trainerId?: number;
}
class UpdateClassDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() weekday?: string;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) startTime?: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
  @IsOptional() @IsInt() trainerId?: number;
}

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async list() {
    const rows = await this.prisma.gymClass.findMany({ orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }], include: { trainer: { select: { name: true } }, _count: { select: { bookings: true } } } });
    return rows.map(({ _count, ...c }) => ({ ...c, booked: _count.bookings, available: c.capacity - _count.bookings }));
  }

  async create(dto: ClassDto, u: AuthUser) {
    const trainerId = u.role === 'ENTRENADOR' ? u.id : dto.trainerId;
    if (!trainerId) throw new ForbiddenException('Indica el entrenador de la clase');
    const c = await this.prisma.gymClass.create({ data: { name: dto.name, weekday: dto.weekday, startTime: dto.startTime, capacity: dto.capacity, trainerId } });
    await this.audit.log(u.id, 'CREAR', 'Clase', `${c.name} ${c.weekday} ${c.startTime}`);
    return c;
  }

  private async editable(id: number, u: AuthUser) {
    const c = await this.prisma.gymClass.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Clase no encontrada');
    if (u.role === 'ENTRENADOR' && c.trainerId !== u.id) throw new ForbiddenException('Solo puedes modificar tus propias clases');
    return c;
  }

  async update(id: number, dto: UpdateClassDto, u: AuthUser) {
    await this.editable(id, u);
    const { trainerId, ...rest } = dto;
    const c = await this.prisma.gymClass.update({ where: { id }, data: { ...rest, ...(u.role === 'ADMIN' && trainerId ? { trainerId } : {}) } });
    await this.audit.log(u.id, 'MODIFICAR', 'Clase', c.name);
    return c;
  }

  async remove(id: number, u: AuthUser) {
    const c = await this.editable(id, u);
    await this.prisma.gymClass.delete({ where: { id } });
    await this.audit.log(u.id, 'ELIMINAR', 'Clase', c.name);
    return { ok: true };
  }
}

/** RF07 (parte 1): gestionar clases, horarios y disponibilidad. */
@Controller('classes')
export class ClassesController {
  constructor(private svc: ClassesService) {}
  @Get() list() { return this.svc.list(); }
  @Roles(Role.ADMIN, Role.ENTRENADOR) @Post() create(@Body() dto: ClassDto, @CurrentUser() u: AuthUser) { return this.svc.create(dto, u); }
  @Roles(Role.ADMIN, Role.ENTRENADOR) @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClassDto, @CurrentUser() u: AuthUser) { return this.svc.update(id, dto, u); }
  @Roles(Role.ADMIN, Role.ENTRENADOR) @Delete(':id') remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.remove(id, u); }
}

@Module({ controllers: [ClassesController], providers: [ClassesService] })
export class ClassesModule {}
