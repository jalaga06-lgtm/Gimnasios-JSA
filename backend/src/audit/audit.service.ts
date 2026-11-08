import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  log(userId: number | null, action: string, entity: string, detail: string) {
    return this.prisma.auditLog.create({ data: { userId, action, entity, detail } });
  }

  list(limit: number) {
    return this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit, include: { user: { select: { name: true, role: true } } } });
  }
}
