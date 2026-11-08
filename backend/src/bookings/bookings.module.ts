import { BadRequestException, Body, ConflictException, Controller, Delete, ForbiddenException, Get, Injectable, Module, NotFoundException, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsInt, IsOptional } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser, Roles } from '../common/auth';
import { bestMembership, effectiveStatus } from '../common/membership.util';

class BookDto { @IsInt() classId: number; @IsOptional() @IsInt() clientId?: number; }

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  private resolveClient(u: AuthUser, clientId?: number) {
    const id = u.role === 'CLIENTE' ? u.clientId : clientId;
    if (!id) throw new BadRequestException(u.role === 'CLIENTE' ? 'Tu usuario no está vinculado a un cliente' : 'Indica el cliente');
    return id;
  }

  list(u: AuthUser, clientId?: number) {
    return this.prisma.booking.findMany({ where: { clientId: this.resolveClient(u, clientId) }, include: { gymClass: true }, orderBy: { id: 'desc' } });
  }

  /** Regla del documento: la reserva depende de que la membresía esté activa. */
  async book(dto: BookDto, u: AuthUser) {
    const clientId = this.resolveClient(u, dto.clientId);
    const m = await bestMembership(this.prisma, clientId);
    if (!m || effectiveStatus(m) !== 'ACTIVA') throw new BadRequestException('No se puede reservar: la membresía no está activa');
    const cls = await this.prisma.gymClass.findUnique({ where: { id: dto.classId }, include: { _count: { select: { bookings: true } } } });
    if (!cls) throw new NotFoundException('Clase no encontrada');
    if (cls._count.bookings >= cls.capacity) throw new BadRequestException('La clase no tiene cupos disponibles');
    try {
      const b = await this.prisma.booking.create({ data: { clientId, classId: cls.id } });
      await this.audit.log(u.id, 'RESERVAR', 'Reserva', `Cliente #${clientId} en ${cls.name}`);
      return b;
    } catch {
      throw new ConflictException('Ya tienes una reserva en esta clase');
    }
  }

  async cancel(id: number, u: AuthUser) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Reserva no encontrada');
    if (u.role === 'CLIENTE' && b.clientId !== u.clientId) throw new ForbiddenException('Solo puedes cancelar tus propias reservas');
    await this.prisma.booking.delete({ where: { id } });
    await this.audit.log(u.id, 'CANCELAR', 'Reserva', `Reserva #${id}`);
    return { ok: true };
  }
}

/** RF07 (parte 2): reservar y cancelar clases. */
@Roles(Role.CLIENTE, Role.RECEPCIONISTA)
@Controller('bookings')
export class BookingsController {
  constructor(private svc: BookingsService) {}
  @Get() list(@CurrentUser() u: AuthUser, @Query('clientId') clientId?: string) { return this.svc.list(u, clientId ? Number(clientId) : undefined); }
  @Post() book(@Body() dto: BookDto, @CurrentUser() u: AuthUser) { return this.svc.book(dto, u); }
  @Delete(':id') cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.cancel(id, u); }
}

@Module({ controllers: [BookingsController], providers: [BookingsService] })
export class BookingsModule {}
