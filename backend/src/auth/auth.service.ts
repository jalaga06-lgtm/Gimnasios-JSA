import { ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService, private audit: AuditService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email }, include: { client: true } });
    if (!user) throw new UnauthorizedException('Credenciales incorrectas');
    if (user.lockedUntil && user.lockedUntil > new Date())
      throw new HttpException(`Cuenta bloqueada por intentos fallidos. Intenta de nuevo después de ${user.lockedUntil.toLocaleTimeString('es-CO')}.`, HttpStatus.TOO_MANY_REQUESTS);
    if (!user.active) throw new ForbiddenException('Usuario desactivado. Habla con el administrador.');

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      const attempts = user.failedAttempts + 1;
      const lock = attempts >= MAX_ATTEMPTS; // RNF04: protección ante intentos repetidos
      await this.prisma.user.update({ where: { id: user.id }, data: { failedAttempts: lock ? 0 : attempts, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60000) : null } });
      await this.audit.log(user.id, 'LOGIN_FALLIDO', 'Sesión', lock ? 'Cuenta bloqueada temporalmente' : `Intento ${attempts} de ${MAX_ATTEMPTS}`);
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: null } });
    await this.audit.log(user.id, 'LOGIN', 'Sesión', 'Inicio de sesión');
    return {
      token: await this.jwt.signAsync({ sub: user.id }),
      user: { id: user.id, name: user.name, role: user.role, clientId: user.client?.id ?? null },
    };
  }
}
