import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const day = 86400000;

/** Crea los datos de demostración (idempotente: se puede ejecutar varias veces). */
export async function seedDemo(prisma: PrismaClient) {
  const mk = (name: string, email: string, password: string, role: Role) =>
    prisma.user.upsert({ where: { email }, update: {}, create: { name, email, role, passwordHash: bcrypt.hashSync(password, 10) } });

  await mk('Ana Torres', 'admin@gym.com', 'Admin123*', 'ADMIN');
  await mk('Diego Rojas', 'recepcion@gym.com', 'Recep123*', 'RECEPCIONISTA');
  const trainer = await mk('Sofía Vargas', 'entrenador@gym.com', 'Entrena123*', 'ENTRENADOR');
  const clientUser = await mk('Laura Gómez', 'cliente@gym.com', 'Cliente123*', 'CLIENTE');

  const laura = await prisma.client.upsert({ where: { document: '1075001' }, update: {}, create: { name: 'Laura Gómez', document: '1075001', phone: '3101112233', email: 'cliente@gym.com', userId: clientUser.id, trainerId: trainer.id } });
  const carlos = await prisma.client.upsert({ where: { document: '1075002' }, update: {}, create: { name: 'Carlos Pérez', document: '1075002', phone: '3204445566', trainerId: trainer.id } });
  await prisma.client.upsert({ where: { document: '1075003' }, update: {}, create: { name: 'Marta Ruiz', document: '1075003' } });

  const plans = [
    { name: 'Mensual', durationDays: 30, price: 80000, conditions: 'Acceso a sala y clases grupales' },
    { name: 'Trimestral', durationDays: 90, price: 210000, conditions: 'Incluye una valoración física' },
    { name: 'Anual', durationDays: 365, price: 750000, conditions: 'Congelación de hasta 15 días' },
  ];
  for (const p of plans) await prisma.plan.upsert({ where: { name: p.name }, update: {}, create: p });
  const tri = await prisma.plan.findUniqueOrThrow({ where: { name: 'Trimestral' } });
  const men = await prisma.plan.findUniqueOrThrow({ where: { name: 'Mensual' } });

  if ((await prisma.membership.count()) === 0) {
    const now = Date.now();
    await prisma.membership.create({ data: { clientId: laura.id, planId: tri.id, startDate: new Date(now - 10 * day), endDate: new Date(now + 80 * day) } });
    await prisma.membership.create({ data: { clientId: carlos.id, planId: men.id, startDate: new Date(now - 45 * day), endDate: new Date(now - 15 * day) } });
  }
  if ((await prisma.gymClass.count()) === 0) {
    await prisma.gymClass.createMany({ data: [
      { name: 'Spinning', trainerId: trainer.id, weekday: 'Lunes', startTime: '06:00', capacity: 2 },
      { name: 'Yoga', trainerId: trainer.id, weekday: 'Miércoles', startTime: '18:00', capacity: 15 },
    ] });
  }
}
