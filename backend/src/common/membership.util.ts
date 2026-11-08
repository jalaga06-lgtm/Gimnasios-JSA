import { Membership, MembershipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

/** Una membresía ACTIVA cuya fecha de fin ya pasó se considera VENCIDA. */
export const effectiveStatus = (m: Pick<Membership, 'status' | 'endDate'>): MembershipStatus =>
  m.status === 'ACTIVA' && m.endDate < new Date() ? 'VENCIDA' : m.status;

/** La membresía vigente del cliente, o la más reciente si no tiene ninguna vigente. */
export async function bestMembership(prisma: PrismaService, clientId: number) {
  const list = await prisma.membership.findMany({ where: { clientId }, orderBy: { endDate: 'desc' }, include: { plan: true } });
  return list.find((m) => effectiveStatus(m) === 'ACTIVA') ?? list[0] ?? null;
}
