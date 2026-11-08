import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../common/auth';
import { effectiveStatus } from '../common/membership.util';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async summary() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const [clients, plans, memberships, granted, denied, today, classes] = await Promise.all([
      this.prisma.client.findMany({ include: { memberships: { orderBy: { endDate: 'desc' } } } }),
      this.prisma.plan.findMany(),
      this.prisma.membership.findMany(),
      this.prisma.accessLog.count({ where: { granted: true } }),
      this.prisma.accessLog.count({ where: { granted: false } }),
      this.prisma.accessLog.count({ where: { createdAt: { gte: startOfDay } } }),
      this.prisma.gymClass.findMany({ include: { _count: { select: { bookings: true } } } }),
    ]);
    const clientsByStatus: Record<string, number> = { ACTIVA: 0, SUSPENDIDA: 0, VENCIDA: 0, SIN_MEMBRESIA: 0 };
    for (const c of clients) {
      const m = c.memberships.find((x) => effectiveStatus(x) === 'ACTIVA') ?? c.memberships[0];
      clientsByStatus[m ? effectiveStatus(m) : 'SIN_MEMBRESIA']++;
    }
    return {
      totalClients: clients.length,
      clientsByStatus,
      membershipsByPlan: plans.map((p) => ({ plan: p.name, total: memberships.filter((m) => m.planId === p.id).length, active: memberships.filter((m) => m.planId === p.id && effectiveStatus(m) === 'ACTIVA').length })),
      access: { granted, denied, today },
      bookingsByClass: classes.map((c) => ({ class: c.name, bookings: c._count.bookings, capacity: c.capacity })),
    };
  }
}

/** RF08: reportes de clientes, membresías, accesos y reservas. */
@Roles(Role.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private svc: ReportsService) {}
  @Get('summary') summary() { return this.svc.summary(); }
}

@Module({ controllers: [ReportsController], providers: [ReportsService] })
export class ReportsModule {}
