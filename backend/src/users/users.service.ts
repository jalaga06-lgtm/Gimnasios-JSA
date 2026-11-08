import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/auth';
import { CreateUserDto, UpdateUserDto } from './users.controller';

const safe = { id: true, name: true, email: true, role: true, active: true, createdAt: true };

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  list() {
    return this.prisma.user.findMany({ select: safe, orderBy: { id: 'asc' } });
  }

  async create(dto: CreateUserDto, actor: AuthUser) {
    if (await this.prisma.user.findUnique({ where: { email: dto.email } })) throw new ConflictException('Ya existe un usuario con ese correo');
    const user = await this.prisma.user.create({ data: { name: dto.name, email: dto.email, role: dto.role, passwordHash: await bcrypt.hash(dto.password, 10) }, select: safe });
    if (dto.clientId) await this.prisma.client.update({ where: { id: dto.clientId }, data: { userId: user.id } });
    await this.audit.log(actor.id, 'CREAR', 'Usuario', `${user.email} (${user.role})`);
    return user;
  }

  async update(id: number, dto: UpdateUserDto, actor: AuthUser) {
    if (!(await this.prisma.user.findUnique({ where: { id } }))) throw new NotFoundException('Usuario no encontrado');
    const { password, clientId, ...rest } = dto;
    const user = await this.prisma.user.update({ where: { id }, data: { ...rest, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) }, select: safe });
    if (clientId) await this.prisma.client.update({ where: { id: clientId }, data: { userId: id } });
    await this.audit.log(actor.id, 'MODIFICAR', 'Usuario', user.email);
    return user;
  }

  async setActive(id: number, active: boolean, actor: AuthUser) {
    if (id === actor.id && !active) throw new BadRequestException('No puedes desactivar tu propio usuario');
    const user = await this.prisma.user.update({ where: { id }, data: { active }, select: safe });
    await this.audit.log(actor.id, active ? 'ACTIVAR' : 'DESACTIVAR', 'Usuario', user.email);
    return user;
  }
}
