import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/auth';
import { addDays, effectiveStatus } from '../common/membership.util';

@Injectable()
export class MembershipsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  // ---- Planes (RF03) ----
  plans() { return this.prisma.plan.findMany({ orderBy: { id: 'asc' } }); }

  async savePlan(data: { name?: string; durationDays?: number; price?: number; conditions?: string }, actor: AuthUser, id?: number) {
    const plan = id
      ? await this.prisma.plan.update({ where: { id }, data })
      : await this.prisma.plan.create({ data: data as { name: string; durationDays: number; price: number; conditions?: string } });
    await this.audit.log(actor.id, id ? 'MODIFICAR' : 'CREAR', 'Plan', plan.name);
    return plan;
  }

  // ---- Membresías (RF04) ----
  async list(clientId?: number) {
    const rows = await this.prisma.membership.findMany({ where: clientId ? { clientId } : {}, orderBy: { id: 'desc' }, include: { plan: true, client: { select: { name: true, document: true } } } });
    return rows.map((m) => ({ ...m, status: effectiveStatus(m) }));
  }

  async register(clientId: number, planId: number, actor: AuthUser) {
    const [client, plan] = await Promise.all([this.prisma.client.findUnique({ where: { id: clientId } }), this.prisma.plan.findUnique({ where: { id: planId } })]);
    if (!client || !plan) throw new NotFoundException('Cliente o plan no encontrado');
    const existing = await this.prisma.membership.findMany({ where: { clientId } });
    if (existing.some((m) => effectiveStatus(m) === 'ACTIVA')) throw new BadRequestException('El cliente ya tiene una membresía activa. Usa la opción de renovar.');
    const now = new Date();
    const m = await this.prisma.membership.create({ data: { clientId, planId, startDate: now, endDate: addDays(now, plan.durationDays) } });
    await this.audit.log(actor.id, 'REGISTRAR', 'Membresía', `${client.name}: plan ${plan.name}`);
    return m;
  }

  private async get(id: number) {
    const m = await this.prisma.membership.findUnique({ where: { id }, include: { plan: true, client: true } });
    if (!m) throw new NotFoundException('Membresía no encontrada');
    return m;
  }

  async suspend(id: number, actor: AuthUser) {
    const m = await this.get(id);
    await this.prisma.membership.update({ where: { id }, data: { status: 'SUSPENDIDA' } });
    await this.audit.log(actor.id, 'SUSPENDER', 'Membresía', m.client.name);
    return { ok: true };
  }

  async activate(id: number, actor: AuthUser) {
    const m = await this.get(id);
    await this.prisma.membership.update({ where: { id }, data: { status: 'ACTIVA' } });
    await this.audit.log(actor.id, 'ACTIVAR', 'Membresía', m.client.name);
    return { ok: true };
  }

  async renew(id: number, actor: AuthUser) {
    const m = await this.get(id);
    const base = m.endDate > new Date() ? m.endDate : new Date();
    await this.prisma.membership.update({ where: { id }, data: { endDate: addDays(base, m.plan.durationDays), status: 'ACTIVA' } });
    await this.audit.log(actor.id, 'RENOVAR', 'Membresía', m.client.name);
    return { ok: true };
  }
}
