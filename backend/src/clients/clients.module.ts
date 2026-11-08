import { Body, ConflictException, Controller, Get, Injectable, Module, NotFoundException, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser, Roles } from '../common/auth';
import { effectiveStatus } from '../common/membership.util';

class ClientDto {
  @IsString() name: string;
  @IsString() document: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
}
class UpdateClientDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() document?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
}

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async list() {
    const clients = await this.prisma.client.findMany({ orderBy: { id: 'asc' }, include: { trainer: { select: { name: true } }, memberships: { orderBy: { endDate: 'desc' }, include: { plan: true } } } });
    return clients.map(({ memberships, ...c }) => {
      const m = memberships.find((x) => effectiveStatus(x) === 'ACTIVA') ?? memberships[0];
      return { ...c, membershipStatus: m ? effectiveStatus(m) : 'SIN_MEMBRESIA', planName: m?.plan.name ?? null, endDate: m?.endDate ?? null };
    });
  }

  async create(dto: ClientDto, actor: AuthUser) {
    if (await this.prisma.client.findUnique({ where: { document: dto.document } })) throw new ConflictException('Ya existe un cliente con ese documento');
    const c = await this.prisma.client.create({ data: dto });
    await this.audit.log(actor.id, 'CREAR', 'Cliente', `${c.name} (${c.document})`);
    return c;
  }

  async update(id: number, dto: UpdateClientDto, actor: AuthUser) {
    if (!(await this.prisma.client.findUnique({ where: { id } }))) throw new NotFoundException('Cliente no encontrado');
    if (dto.document && (await this.prisma.client.findFirst({ where: { document: dto.document, NOT: { id } } }))) throw new ConflictException('Ya existe un cliente con ese documento');
    const c = await this.prisma.client.update({ where: { id }, data: dto });
    await this.audit.log(actor.id, 'MODIFICAR', 'Cliente', `${c.name} (${c.document})`);
    return c;
  }
}

/** RF02: registrar y actualizar clientes. */
@Roles(Role.ADMIN, Role.RECEPCIONISTA)
@Controller('clients')
export class ClientsController {
  constructor(private clients: ClientsService) {}
  @Get() list() { return this.clients.list(); }
  @Post() create(@Body() dto: ClientDto, @CurrentUser() u: AuthUser) { return this.clients.create(dto, u); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClientDto, @CurrentUser() u: AuthUser) { return this.clients.update(id, dto, u); }
}

@Module({ controllers: [ClientsController], providers: [ClientsService] })
export class ClientsModule {}
