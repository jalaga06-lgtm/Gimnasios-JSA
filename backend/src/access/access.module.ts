import { Body, Controller, ForbiddenException, Get, Injectable, Module, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser, Roles } from '../common/auth';
import { bestMembership, effectiveStatus } from '../common/membership.util';

class ValidateDto { @IsString() document: string; }

@Injectable()
export class AccessService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  /** RF05: verifica estado y vigencia de la membresía y registra el ingreso. */
  async validate(document: string, actor: AuthUser) {
    const client = await this.prisma.client.findUnique({ where: { document } });
    let granted = false;
    let reason = 'Documento no registrado';
    if (client) {
      const m = await bestMembership(this.prisma, client.id);
      const status = m ? effectiveStatus(m) : null;
      granted = status === 'ACTIVA';
      reason = !m ? 'Sin membresía registrada' : granted ? `Vigente hasta ${m.endDate.toLocaleDateString('es-CO')}` : `Membresía ${status!.toLowerCase()}`;
    }
    await this.prisma.accessLog.create({ data: { clientId: client?.id, document, granted, reason } });
    await this.audit.log(actor.id, granted ? 'ACCESO_PERMITIDO' : 'ACCESO_DENEGADO', 'Acceso', `${client?.name ?? document}: ${reason}`);
    return { granted, reason, clientName: client?.name ?? null };
  }

  list(clientId?: number) {
    return this.prisma.accessLog.findMany({ where: clientId ? { clientId } : {}, orderBy: { createdAt: 'desc' }, take: 50, include: { client: { select: { name: true } } } });
  }
}

@Controller('access')
export class AccessController {
  constructor(private access: AccessService, private prisma: PrismaService) {}

  @Roles(Role.RECEPCIONISTA) @Post('validate')
  validate(@Body() dto: ValidateDto, @CurrentUser() u: AuthUser) { return this.access.validate(dto.document.trim(), u); }

  @Roles(Role.RECEPCIONISTA) @Get()
  list() { return this.access.list(); }

  @Roles(Role.CLIENTE) @Get('me')
  async mine(@CurrentUser() u: AuthUser) {
    if (!u.clientId) throw new ForbiddenException('Tu usuario no está vinculado a un cliente');
    const m = await bestMembership(this.prisma, u.clientId);
    return { status: m ? effectiveStatus(m) : 'SIN_MEMBRESIA', endDate: m?.endDate ?? null, history: await this.access.list(u.clientId) };
  }
}

@Module({ controllers: [AccessController], providers: [AccessService] })
export class AccessModule {}
